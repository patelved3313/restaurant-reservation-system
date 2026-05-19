from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.domain.backtest import BacktestEngine
from app.domain.broker import InteractiveBrokersAdapter, PaperBrokerAdapter
from app.domain.market_data import HistoricalDataProvider, MockMarketDataProvider
from app.domain.portfolio import PaperPortfolioManager, equity_curve, get_max_drawdown, get_realized_win_rate
from app.domain.risk import get_or_create_risk_settings
from app.models import Backtest, PortfolioSnapshot, Position, Strategy, SystemLog, Trade
from app.schemas import (
    BacktestRead,
    BacktestRequest,
    OrderRequest,
    PaperControlResponse,
    RiskSettingsRead,
    RiskSettingsUpdate,
    StrategyCreate,
    StrategyRead,
    StrategyUpdate,
)

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)) -> dict[str, Any]:
    snapshot = PaperPortfolioManager(MockMarketDataProvider()).refresh_snapshot(db)
    positions = db.query(Position).filter(Position.quantity != 0).order_by(Position.symbol.asc()).all()
    recent_trades = db.query(Trade).order_by(Trade.timestamp.desc()).limit(8).all()

    return {
        "portfolio_value": snapshot["portfolio_value"],
        "cash_balance": snapshot["cash_balance"],
        "open_positions": len(positions),
        "daily_pnl": snapshot["daily_pnl"],
        "total_return": snapshot["total_return"],
        "win_rate": get_realized_win_rate(db),
        "max_drawdown": get_max_drawdown(db),
        "recent_trades": [_trade_to_dict(trade) for trade in recent_trades],
        "equity_curve": equity_curve(db),
        "warning": "This app is for education and paper trading only. Trading involves risk.",
    }


@router.get("/positions")
def positions(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    PaperPortfolioManager(MockMarketDataProvider()).refresh_snapshot(db)
    rows = db.query(Position).order_by(Position.symbol.asc()).all()
    return [_position_to_dict(position) for position in rows]


@router.get("/trades")
def trades(
    limit: int = Query(default=200, ge=1, le=1_000),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.query(Trade).order_by(Trade.timestamp.desc()).limit(limit).all()
    return [_trade_to_dict(trade) for trade in rows]


@router.get("/market-data/{symbol}")
def market_data(
    symbol: str,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
) -> dict[str, Any]:
    end = end_date or date.today()
    start = start_date or end - timedelta(days=365)
    if end <= start:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")

    normalized_symbol = symbol.strip().upper()
    candles = HistoricalDataProvider().get_ohlcv(normalized_symbol, start, end)
    if len(candles) < 2:
        raise HTTPException(status_code=400, detail="Not enough market data for this symbol and date range")

    enriched: list[dict[str, Any]] = []
    previous_close: float | None = None
    for candle in candles:
        close = float(candle["close"])
        daily_return = ((close - previous_close) / previous_close) if previous_close else 0.0
        enriched.append({**candle, "daily_return": round(daily_return, 6)})
        previous_close = close

    first_close = float(enriched[0]["close"])
    last_close = float(enriched[-1]["close"])
    summary = {
        "first_close": round(first_close, 4),
        "last_close": round(last_close, 4),
        "change": round(last_close - first_close, 4),
        "change_pct": round((last_close - first_close) / first_close, 6) if first_close else 0.0,
        "high": round(max(float(candle["high"]) for candle in enriched), 4),
        "low": round(min(float(candle["low"]) for candle in enriched), 4),
        "average_volume": round(sum(int(candle["volume"]) for candle in enriched) / len(enriched)),
    }
    return {
        "symbol": normalized_symbol,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "source": "Yahoo Finance historical data when available; deterministic mock fallback otherwise.",
        "summary": summary,
        "candles": enriched,
    }


@router.post("/strategies", response_model=StrategyRead)
def create_strategy(payload: StrategyCreate, db: Session = Depends(get_db)) -> Strategy:
    strategy = Strategy(
        user_id=1,
        name=payload.name,
        description=payload.description,
        symbol=payload.symbol,
        rules=payload.rules.model_dump(),
        status="draft",
    )
    db.add(strategy)
    db.add(
        SystemLog(
            level="info",
            event_type="STRATEGY_CREATED",
            message=f"Strategy {payload.name} created for {payload.symbol}.",
            context={"strategy": payload.model_dump()},
        )
    )
    db.commit()
    db.refresh(strategy)
    return strategy


@router.get("/strategies", response_model=list[StrategyRead])
def list_strategies(db: Session = Depends(get_db)) -> list[Strategy]:
    return db.query(Strategy).order_by(Strategy.created_at.desc()).all()


@router.put("/strategies/{strategy_id}", response_model=StrategyRead)
def update_strategy(strategy_id: int, payload: StrategyUpdate, db: Session = Depends(get_db)) -> Strategy:
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    strategy.name = payload.name
    strategy.description = payload.description
    strategy.symbol = payload.symbol
    strategy.rules = payload.rules.model_dump()
    strategy.status = payload.status
    db.add(
        SystemLog(
            level="info",
            event_type="STRATEGY_UPDATED",
            message=f"Strategy {payload.name} updated for {payload.symbol}.",
            context={"strategy_id": strategy_id, "strategy": payload.model_dump()},
        )
    )
    db.commit()
    db.refresh(strategy)
    return strategy


@router.post("/backtest", response_model=BacktestRead)
def run_backtest(payload: BacktestRequest, db: Session = Depends(get_db)) -> Backtest:
    strategy: Strategy | None = None
    if payload.strategy_id:
        strategy = db.query(Strategy).filter(Strategy.id == payload.strategy_id).first()
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        symbol = strategy.symbol
        rules = strategy.rules
    else:
        symbol = payload.symbol.upper() if payload.symbol else None
        rules = payload.rules.model_dump() if payload.rules else None

    if not symbol or not rules:
        raise HTTPException(status_code=422, detail="Provide a strategy_id or inline symbol and rules")

    candles = HistoricalDataProvider().get_ohlcv(symbol, payload.start_date, payload.end_date)
    if len(candles) < 2:
        raise HTTPException(status_code=400, detail="Not enough market data for this backtest")

    result = BacktestEngine().run(candles, rules, payload.starting_cash, payload.fees_bps, payload.slippage_bps)
    backtest = Backtest(
        strategy_id=strategy.id if strategy else None,
        name=f"{symbol} {rules.get('strategy_type', 'strategy')} backtest",
        symbol=symbol,
        start_date=payload.start_date.isoformat(),
        end_date=payload.end_date.isoformat(),
        starting_cash=result["starting_cash"],
        ending_cash=result["ending_cash"],
        metrics=result["metrics"],
        trades=result["trades"],
        equity_curve=result["equity_curve"],
    )
    db.add(backtest)
    db.add(
        SystemLog(
            level="info",
            event_type="BACKTEST_COMPLETED",
            message=f"Backtest completed for {symbol}.",
            context={"metrics": result["metrics"], "strategy_id": payload.strategy_id},
        )
    )
    db.commit()
    db.refresh(backtest)
    return backtest


@router.get("/backtests", response_model=list[BacktestRead])
def list_backtests(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Backtest]:
    return db.query(Backtest).order_by(Backtest.created_at.desc()).limit(limit).all()


@router.get("/backtests/{backtest_id}", response_model=BacktestRead)
def get_backtest(backtest_id: int, db: Session = Depends(get_db)) -> Backtest:
    backtest = db.query(Backtest).filter(Backtest.id == backtest_id).first()
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return backtest


@router.post("/paper/start", response_model=PaperControlResponse)
def start_paper_trading(db: Session = Depends(get_db)) -> PaperControlResponse:
    db.add(SystemLog(level="info", event_type="PAPER_TRADING_STARTED", message="Paper trading session started.", context={}))
    db.commit()
    return PaperControlResponse(status="running", message="Paper trading started. Orders remain simulated only.")


@router.post("/paper/stop", response_model=PaperControlResponse)
def stop_paper_trading(db: Session = Depends(get_db)) -> PaperControlResponse:
    db.add(SystemLog(level="info", event_type="PAPER_TRADING_STOPPED", message="Paper trading session stopped.", context={}))
    db.commit()
    return PaperControlResponse(status="stopped", message="Paper trading stopped.")


@router.post("/orders/paper")
def paper_order(payload: OrderRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    return PaperBrokerAdapter(db).place_order(payload)


@router.post("/kill-switch")
def kill_switch(db: Session = Depends(get_db)) -> dict[str, Any]:
    settings = get_or_create_risk_settings(db)
    settings.kill_switch_enabled = True
    db.add(
        SystemLog(
            level="critical",
            event_type="KILL_SWITCH_ENABLED",
            message="Emergency kill switch enabled. New paper orders will be blocked.",
            context={},
        )
    )
    db.commit()
    return {"status": "enabled", "message": "Emergency kill switch enabled."}


@router.get("/risk", response_model=RiskSettingsRead)
def get_risk(db: Session = Depends(get_db)):
    return get_or_create_risk_settings(db)


@router.put("/risk", response_model=RiskSettingsRead)
def update_risk(payload: RiskSettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_risk_settings(db)
    for key, value in payload.model_dump().items():
        setattr(settings, key, value)
    db.add(
        SystemLog(
            level="info",
            event_type="RISK_SETTINGS_UPDATED",
            message="Risk settings updated.",
            context=payload.model_dump(),
        )
    )
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/logs")
def logs(
    limit: int = Query(default=200, ge=1, le=1_000),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.query(SystemLog).order_by(SystemLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "level": row.level,
            "event_type": row.event_type,
            "message": row.message,
            "context": row.context,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


@router.get("/settings")
def app_settings() -> dict[str, Any]:
    settings = get_settings()
    live_probe = InteractiveBrokersAdapter().place_order  # Exposes that the adapter is present without executing it.
    return {
        "app_name": settings.app_name,
        "enable_live_trading": settings.enable_live_trading,
        "paper_starting_cash": settings.paper_starting_cash,
        "live_trading_status": "disabled" if not settings.enable_live_trading else "adapter stub only",
        "interactive_brokers_adapter": "prepared_not_enabled",
        "live_probe_registered": callable(live_probe),
        "warning": "Live trading execution is intentionally disabled unless ENABLE_LIVE_TRADING=true and a live adapter is implemented.",
    }


def _trade_to_dict(trade: Trade) -> dict[str, Any]:
    return {
        "id": trade.id,
        "strategy_id": trade.strategy_id,
        "symbol": trade.symbol,
        "side": trade.side,
        "order_type": trade.order_type,
        "quantity": trade.quantity,
        "price": trade.price,
        "fees": trade.fees,
        "slippage": trade.slippage,
        "status": trade.status,
        "broker": trade.broker,
        "details": jsonable_encoder(trade.details),
        "timestamp": trade.timestamp.isoformat(),
    }


def _position_to_dict(position: Position) -> dict[str, Any]:
    return {
        "id": position.id,
        "symbol": position.symbol,
        "quantity": position.quantity,
        "average_price": position.average_price,
        "market_price": position.market_price,
        "realized_pnl": position.realized_pnl,
        "unrealized_pnl": position.unrealized_pnl,
        "updated_at": position.updated_at.isoformat(),
    }

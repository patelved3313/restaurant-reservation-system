from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.interfaces import MarketDataProvider, PortfolioManager
from app.domain.market_data import MockMarketDataProvider
from app.models import PortfolioSnapshot, Position


class PaperPortfolioManager(PortfolioManager):
    def __init__(self, market_data: MarketDataProvider | None = None) -> None:
        self.market_data = market_data or MockMarketDataProvider()
        self.settings = get_settings()

    def refresh_snapshot(self, db: Session) -> dict[str, Any]:
        latest = get_latest_snapshot(db)
        cash = latest.cash_balance if latest else self.settings.paper_starting_cash
        positions = db.query(Position).filter(Position.quantity != 0).all()
        positions_value = 0.0

        for position in positions:
            latest_price = self.market_data.get_latest_price(position.symbol)
            position.market_price = latest_price
            position.unrealized_pnl = (latest_price - position.average_price) * position.quantity
            positions_value += latest_price * position.quantity

        portfolio_value = cash + positions_value
        starting_cash = get_starting_cash(db)
        previous_today = get_first_snapshot_since(db, datetime.now(UTC).replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0))
        daily_pnl = portfolio_value - previous_today.portfolio_value if previous_today else 0.0
        total_return = (portfolio_value - starting_cash) / starting_cash if starting_cash else 0.0

        snapshot = PortfolioSnapshot(
            portfolio_value=round(portfolio_value, 2),
            cash_balance=round(cash, 2),
            daily_pnl=round(daily_pnl, 2),
            total_return=round(total_return, 6),
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return {
            "portfolio_value": snapshot.portfolio_value,
            "cash_balance": snapshot.cash_balance,
            "daily_pnl": snapshot.daily_pnl,
            "total_return": snapshot.total_return,
        }


def get_starting_cash(db: Session) -> float:
    first = db.query(PortfolioSnapshot).order_by(PortfolioSnapshot.created_at.asc()).first()
    return first.cash_balance if first else get_settings().paper_starting_cash


def get_latest_snapshot(db: Session) -> PortfolioSnapshot | None:
    return db.query(PortfolioSnapshot).order_by(PortfolioSnapshot.created_at.desc()).first()


def get_first_snapshot_since(db: Session, since: datetime) -> PortfolioSnapshot | None:
    return (
        db.query(PortfolioSnapshot)
        .filter(PortfolioSnapshot.created_at >= since)
        .order_by(PortfolioSnapshot.created_at.asc())
        .first()
    )


def get_weekly_pnl(db: Session, current_value: float) -> float:
    week_ago = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=7)
    baseline = get_first_snapshot_since(db, week_ago)
    return current_value - baseline.portfolio_value if baseline else 0.0


def get_max_drawdown(db: Session) -> float:
    values = [value for (value,) in db.query(PortfolioSnapshot.portfolio_value).order_by(PortfolioSnapshot.created_at.asc()).all()]
    if not values:
        return 0.0
    peak = values[0]
    max_drawdown = 0.0
    for value in values:
        peak = max(peak, value)
        if peak:
            max_drawdown = min(max_drawdown, (value - peak) / peak)
    return round(abs(max_drawdown), 6)


def get_realized_win_rate(db: Session) -> float:
    from app.models import Trade

    sell_trades = db.query(Trade).filter(Trade.side == "sell", Trade.status == "filled").all()
    if not sell_trades:
        return 0.0
    wins = sum(1 for trade in sell_trades if float(trade.details.get("realized_pnl", 0)) > 0)
    return round(wins / len(sell_trades), 6)


def equity_curve(db: Session, limit: int = 120) -> list[dict[str, Any]]:
    snapshots = (
        db.query(PortfolioSnapshot)
        .order_by(PortfolioSnapshot.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {"date": snapshot.created_at.isoformat(), "value": round(snapshot.portfolio_value, 2)}
        for snapshot in reversed(snapshots)
    ]


def total_position_market_value(db: Session) -> float:
    value = db.query(func.sum(Position.quantity * Position.market_price)).scalar()
    return float(value or 0.0)

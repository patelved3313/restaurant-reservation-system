from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.interfaces import BrokerAdapter, MarketDataProvider
from app.domain.market_data import MockMarketDataProvider
from app.domain.portfolio import PaperPortfolioManager, get_latest_snapshot, get_weekly_pnl
from app.domain.risk import TradingRiskManager
from app.models import PortfolioSnapshot, Position, SystemLog, Trade
from app.schemas import OrderRequest


class PaperBrokerAdapter(BrokerAdapter):
    def __init__(
        self,
        db: Session,
        market_data: MarketDataProvider | None = None,
        risk_manager: TradingRiskManager | None = None,
    ) -> None:
        self.db = db
        self.market_data = market_data or MockMarketDataProvider()
        self.risk_manager = risk_manager or TradingRiskManager()
        self.settings = get_settings()
        self.portfolio = PaperPortfolioManager(self.market_data)

    def place_order(self, order: OrderRequest) -> dict[str, Any]:
        latest_price = self.market_data.get_latest_price(order.symbol)
        if order.order_type == "limit" and not self._limit_is_marketable(order, latest_price):
            return self._reject(order, latest_price, ["Limit order is not marketable in the paper simulator."])

        execution_price = self._execution_price(order, latest_price)
        latest_snapshot = get_latest_snapshot(self.db) or self._seed_snapshot()
        portfolio_value = latest_snapshot.portfolio_value
        weekly_pnl = get_weekly_pnl(self.db, portfolio_value)

        self._log("info", "ORDER_ATTEMPT", "Paper order received.", {"order": order.model_dump()})
        allowed, reasons = self.risk_manager.validate_order(
            self.db,
            order,
            execution_price,
            portfolio_value,
            latest_snapshot.daily_pnl,
            weekly_pnl,
            live_order=False,
        )
        if not allowed:
            return self._reject(order, execution_price, reasons)

        if order.side == "buy":
            return self._buy(order, execution_price, latest_snapshot)
        return self._sell(order, execution_price, latest_snapshot)

    def _buy(self, order: OrderRequest, execution_price: float, snapshot: PortfolioSnapshot) -> dict[str, Any]:
        gross = order.quantity * execution_price
        fees = gross * self.settings.default_fees_bps / 10_000
        slippage = order.quantity * abs(execution_price - self.market_data.get_latest_price(order.symbol))
        total_cost = gross + fees

        if total_cost > snapshot.cash_balance:
            return self._reject(order, execution_price, ["Insufficient paper cash balance."])

        position = self.db.query(Position).filter(Position.symbol == order.symbol).first()
        if position:
            new_quantity = position.quantity + order.quantity
            position.average_price = ((position.quantity * position.average_price) + gross) / new_quantity
            position.quantity = new_quantity
            position.market_price = execution_price
            position.unrealized_pnl = (execution_price - position.average_price) * position.quantity
        else:
            position = Position(
                symbol=order.symbol,
                quantity=order.quantity,
                average_price=execution_price,
                market_price=execution_price,
                unrealized_pnl=0.0,
            )
            self.db.add(position)

        new_cash = snapshot.cash_balance - total_cost
        self._record_trade(order, execution_price, fees, slippage, "filled", {})
        self._snapshot(new_cash)
        self._log("info", "ORDER_FILLED", "Paper buy order filled.", {"symbol": order.symbol, "quantity": order.quantity})
        self.db.commit()
        return {"status": "filled", "symbol": order.symbol, "side": order.side, "price": round(execution_price, 4), "quantity": order.quantity}

    def _sell(self, order: OrderRequest, execution_price: float, snapshot: PortfolioSnapshot) -> dict[str, Any]:
        position = self.db.query(Position).filter(Position.symbol == order.symbol).first()
        if not position or position.quantity < order.quantity:
            return self._reject(order, execution_price, ["Cannot sell more shares than the paper portfolio holds."])

        gross = order.quantity * execution_price
        fees = gross * self.settings.default_fees_bps / 10_000
        slippage = order.quantity * abs(execution_price - self.market_data.get_latest_price(order.symbol))
        realized_pnl = (execution_price - position.average_price) * order.quantity - fees

        position.quantity -= order.quantity
        position.realized_pnl += realized_pnl
        position.market_price = execution_price
        position.unrealized_pnl = (execution_price - position.average_price) * position.quantity if position.quantity else 0.0
        if position.quantity == 0:
            position.average_price = 0.0

        new_cash = snapshot.cash_balance + gross - fees
        self._record_trade(order, execution_price, fees, slippage, "filled", {"realized_pnl": round(realized_pnl, 4)})
        self._snapshot(new_cash)
        self._log("info", "ORDER_FILLED", "Paper sell order filled.", {"symbol": order.symbol, "quantity": order.quantity, "realized_pnl": round(realized_pnl, 4)})
        self.db.commit()
        return {
            "status": "filled",
            "symbol": order.symbol,
            "side": order.side,
            "price": round(execution_price, 4),
            "quantity": order.quantity,
            "realized_pnl": round(realized_pnl, 4),
        }

    def _execution_price(self, order: OrderRequest, latest_price: float) -> float:
        if order.order_type == "limit" and order.limit_price:
            latest_price = order.limit_price
        slip = self.settings.default_slippage_bps / 10_000
        return latest_price * (1 + slip if order.side == "buy" else 1 - slip)

    @staticmethod
    def _limit_is_marketable(order: OrderRequest, latest_price: float) -> bool:
        if order.order_type != "limit" or order.limit_price is None:
            return True
        if order.side == "buy":
            return latest_price <= order.limit_price
        return latest_price >= order.limit_price

    def _record_trade(
        self,
        order: OrderRequest,
        execution_price: float,
        fees: float,
        slippage: float,
        status: str,
        details: dict[str, Any],
    ) -> Trade:
        trade = Trade(
            strategy_id=order.strategy_id,
            symbol=order.symbol,
            side=order.side,
            order_type=order.order_type,
            quantity=order.quantity,
            price=round(execution_price, 4),
            fees=round(fees, 4),
            slippage=round(slippage, 4),
            status=status,
            broker="paper",
            details=details,
        )
        self.db.add(trade)
        return trade

    def _snapshot(self, cash_balance: float) -> None:
        positions = self.db.query(Position).filter(Position.quantity != 0).all()
        positions_value = sum(position.quantity * position.market_price for position in positions)
        starting_cash = self.settings.paper_starting_cash
        portfolio_value = cash_balance + positions_value
        self.db.add(
            PortfolioSnapshot(
                portfolio_value=round(portfolio_value, 2),
                cash_balance=round(cash_balance, 2),
                total_return=round((portfolio_value - starting_cash) / starting_cash, 6),
            )
        )

    def _seed_snapshot(self) -> PortfolioSnapshot:
        snapshot = PortfolioSnapshot(
            portfolio_value=self.settings.paper_starting_cash,
            cash_balance=self.settings.paper_starting_cash,
            total_return=0.0,
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def _reject(self, order: OrderRequest, execution_price: float, reasons: list[str]) -> dict[str, Any]:
        self._record_trade(order, execution_price, 0.0, 0.0, "rejected", {"reasons": reasons})
        self._log("warning", "ORDER_REJECTED", "Paper order rejected by simulator or risk manager.", {"reasons": reasons, "order": order.model_dump()})
        self.db.commit()
        return {"status": "rejected", "reasons": reasons, "symbol": order.symbol, "side": order.side}

    def _log(self, level: str, event_type: str, message: str, context: dict[str, Any]) -> None:
        self.db.add(SystemLog(level=level, event_type=event_type, message=message, context=context))


class InteractiveBrokersAdapter(BrokerAdapter):
    def __init__(self) -> None:
        self.settings = get_settings()

    def place_order(self, order: OrderRequest) -> dict[str, Any]:
        if not self.settings.enable_live_trading:
            return {
                "status": "blocked",
                "message": "Interactive Brokers live trading is disabled. Set ENABLE_LIVE_TRADING=true explicitly before implementing live execution.",
            }
        raise NotImplementedError("Live Interactive Brokers execution is intentionally not implemented in the paper-first build.")


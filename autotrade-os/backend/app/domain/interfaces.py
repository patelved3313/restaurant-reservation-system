from abc import ABC, abstractmethod
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.schemas import OrderRequest


class MarketDataProvider(ABC):
    @abstractmethod
    def get_ohlcv(self, symbol: str, start: date, end: date) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def get_latest_price(self, symbol: str) -> float:
        raise NotImplementedError


class BrokerAdapter(ABC):
    @abstractmethod
    def place_order(self, order: OrderRequest) -> dict[str, Any]:
        raise NotImplementedError


class StrategyEngine(ABC):
    @abstractmethod
    def generate_signals(self, candles: list[dict[str, Any]], rules: dict[str, Any]) -> list[dict[str, Any]]:
        raise NotImplementedError


class RiskManager(ABC):
    @abstractmethod
    def validate_order(
        self,
        db: Session,
        order: OrderRequest,
        execution_price: float,
        portfolio_value: float,
        daily_pnl: float,
        weekly_pnl: float,
        live_order: bool = False,
    ) -> tuple[bool, list[str]]:
        raise NotImplementedError


class PortfolioManager(ABC):
    @abstractmethod
    def refresh_snapshot(self, db: Session) -> dict[str, Any]:
        raise NotImplementedError


from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


StrategyType = Literal["moving_average_crossover", "rsi", "macd", "price_breakout", "daily_drop_hold"]
OrderSide = Literal["buy", "sell"]
OrderType = Literal["market", "limit"]


class StrategyRuleSet(BaseModel):
    strategy_type: StrategyType = "moving_average_crossover"
    short_window: int = Field(default=20, ge=2, le=250)
    long_window: int = Field(default=50, ge=3, le=400)
    rsi_period: int = Field(default=14, ge=2, le=100)
    rsi_overbought: float = Field(default=70, ge=50, le=100)
    rsi_oversold: float = Field(default=30, ge=0, le=50)
    macd_fast: int = Field(default=12, ge=2, le=100)
    macd_slow: int = Field(default=26, ge=3, le=200)
    macd_signal: int = Field(default=9, ge=2, le=100)
    breakout_window: int = Field(default=20, ge=2, le=250)
    daily_drop_pct: float = Field(default=0.05, gt=0, le=0.5)
    hold_days: int = Field(default=5, ge=1, le=60)
    fixed_position_notional: float | None = Field(default=None, gt=0, le=1_000_000)
    stop_loss_pct: float = Field(default=0.02, gt=0, le=0.5)
    take_profit_pct: float = Field(default=0.04, gt=0, le=1.0)
    position_size_pct: float = Field(default=0.1, gt=0, le=1.0)
    max_daily_loss: float = Field(default=0.03, gt=0, le=0.5)
    max_open_trades: int = Field(default=3, ge=1, le=50)
    reinvest_profits: bool = True

    @model_validator(mode="after")
    def validate_windows(self) -> "StrategyRuleSet":
        if self.strategy_type == "moving_average_crossover" and self.short_window >= self.long_window:
            raise ValueError("short_window must be less than long_window")
        if self.strategy_type == "macd" and self.macd_fast >= self.macd_slow:
            raise ValueError("macd_fast must be less than macd_slow")
        return self


class StrategyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2_000)
    symbol: str = Field(min_length=1, max_length=16)
    rules: StrategyRuleSet

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.strip().upper()


class StrategyUpdate(StrategyCreate):
    status: Literal["draft", "active", "paused", "archived"] = "draft"


class StrategyRead(BaseModel):
    id: int
    name: str
    description: str | None
    symbol: str
    rules: dict[str, Any]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BacktestRequest(BaseModel):
    strategy_id: int | None = None
    symbol: str | None = Field(default=None, max_length=16)
    rules: StrategyRuleSet | None = None
    start_date: date
    end_date: date
    starting_cash: float = Field(default=100_000, gt=0, le=100_000_000)
    fees_bps: float = Field(default=1.0, ge=0, le=100)
    slippage_bps: float = Field(default=2.0, ge=0, le=200)

    @model_validator(mode="after")
    def validate_backtest(self) -> "BacktestRequest":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        if not self.strategy_id and (not self.symbol or not self.rules):
            raise ValueError("Provide strategy_id or both symbol and rules")
        return self


class BacktestRead(BaseModel):
    id: int
    strategy_id: int | None
    name: str
    symbol: str
    start_date: str
    end_date: str
    starting_cash: float
    ending_cash: float
    metrics: dict[str, Any]
    trades: list[dict[str, Any]]
    equity_curve: list[dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=16)
    side: OrderSide
    order_type: OrderType = "market"
    quantity: float = Field(gt=0, le=1_000_000)
    limit_price: float | None = Field(default=None, gt=0)
    stop_loss_price: float | None = Field(default=None, gt=0)
    take_profit_price: float | None = Field(default=None, gt=0)
    strategy_id: int | None = None

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.strip().upper()

    @model_validator(mode="after")
    def validate_order_shape(self) -> "OrderRequest":
        if self.order_type == "limit" and self.limit_price is None:
            raise ValueError("limit_price is required for limit orders")
        return self


class RiskSettingsUpdate(BaseModel):
    max_risk_per_trade: float = Field(gt=0, le=0.02)
    max_daily_loss: float = Field(gt=0, le=0.5)
    max_weekly_loss: float = Field(gt=0, le=0.75)
    max_position_size: float = Field(gt=0, le=1.0)
    stop_loss_required: bool = True
    kill_switch_enabled: bool = False
    allow_after_hours: bool = False


class RiskSettingsRead(RiskSettingsUpdate):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaperControlResponse(BaseModel):
    status: str
    message: str

from __future__ import annotations

from datetime import datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.interfaces import RiskManager
from app.models import RiskSettings
from app.schemas import OrderRequest


class TradingRiskManager(RiskManager):
    def __init__(self) -> None:
        self.settings = get_settings()

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
        risk_settings = get_or_create_risk_settings(db)
        reasons: list[str] = []

        if live_order and not self.settings.enable_live_trading:
            reasons.append("Live trading is disabled. Set ENABLE_LIVE_TRADING=true explicitly to enable it.")
        if risk_settings.kill_switch_enabled:
            reasons.append("Emergency kill switch is enabled.")
        if not risk_settings.allow_after_hours and not is_market_open(self.settings.market_timezone):
            reasons.append("Trading outside regular market hours is blocked.")
        if daily_pnl < 0 and abs(daily_pnl) >= portfolio_value * risk_settings.max_daily_loss:
            reasons.append("Maximum daily loss limit has been reached.")
        if weekly_pnl < 0 and abs(weekly_pnl) >= portfolio_value * risk_settings.max_weekly_loss:
            reasons.append("Maximum weekly loss limit has been reached.")

        notional = execution_price * order.quantity
        if notional > portfolio_value * risk_settings.max_position_size:
            reasons.append("Order exceeds maximum position size.")

        if order.side == "buy" and risk_settings.stop_loss_required:
            if order.stop_loss_price is None:
                reasons.append("Stop-loss is required for every buy order.")
            elif order.stop_loss_price >= execution_price:
                reasons.append("Stop-loss must be below the execution price for buy orders.")
            else:
                risk_amount = (execution_price - order.stop_loss_price) * order.quantity
                max_risk_pct = min(risk_settings.max_risk_per_trade, self.settings.default_max_risk_per_trade)
                if risk_amount > portfolio_value * max_risk_pct:
                    reasons.append("Order risks more than the configured per-trade limit.")

        return len(reasons) == 0, reasons


def is_market_open(timezone_name: str = "America/New_York", now: datetime | None = None) -> bool:
    timezone = ZoneInfo(timezone_name)
    local_now = now.astimezone(timezone) if now else datetime.now(timezone)
    if local_now.weekday() >= 5:
        return False
    return time(9, 30) <= local_now.time() <= time(16, 0)


def get_or_create_risk_settings(db: Session) -> RiskSettings:
    settings = db.query(RiskSettings).filter(RiskSettings.user_id == 1).first()
    if settings:
        return settings
    settings = RiskSettings(user_id=1)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


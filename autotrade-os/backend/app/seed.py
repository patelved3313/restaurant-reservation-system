from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import PortfolioSnapshot, RiskSettings, SystemLog, User


def ensure_defaults(db: Session) -> None:
    settings = get_settings()
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        db.add(User(id=1, email="personal@autotrade.local", name="Personal Trader"))

    risk = db.query(RiskSettings).filter(RiskSettings.user_id == 1).first()
    if not risk:
        db.add(
            RiskSettings(
                user_id=1,
                max_risk_per_trade=min(settings.default_max_risk_per_trade, 0.02),
                max_daily_loss=0.03,
                max_weekly_loss=0.06,
                max_position_size=0.25,
                stop_loss_required=True,
                kill_switch_enabled=False,
                allow_after_hours=False,
            )
        )

    snapshot = db.query(PortfolioSnapshot).first()
    if not snapshot:
        db.add(
            PortfolioSnapshot(
                portfolio_value=settings.paper_starting_cash,
                cash_balance=settings.paper_starting_cash,
                daily_pnl=0.0,
                total_return=0.0,
            )
        )

    db.add(
        SystemLog(
            level="info",
            event_type="SYSTEM_BOOT",
            message="AutoTrade OS initialized in simulation and paper trading mode.",
            context={"ENABLE_LIVE_TRADING": settings.enable_live_trading},
        )
    )
    db.commit()


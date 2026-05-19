from app.domain.risk import TradingRiskManager, get_or_create_risk_settings
from app.schemas import OrderRequest


def test_risk_manager_requires_stop_loss(db_session):
    settings = get_or_create_risk_settings(db_session)
    settings.allow_after_hours = True
    db_session.commit()

    order = OrderRequest(symbol="SPY", side="buy", order_type="market", quantity=10)
    allowed, reasons = TradingRiskManager().validate_order(
        db_session,
        order,
        execution_price=100,
        portfolio_value=100_000,
        daily_pnl=0,
        weekly_pnl=0,
    )

    assert not allowed
    assert any("Stop-loss" in reason for reason in reasons)


def test_risk_manager_blocks_live_trading_by_default(db_session):
    settings = get_or_create_risk_settings(db_session)
    settings.allow_after_hours = True
    db_session.commit()

    order = OrderRequest(symbol="SPY", side="buy", order_type="market", quantity=1, stop_loss_price=99)
    allowed, reasons = TradingRiskManager().validate_order(
        db_session,
        order,
        execution_price=100,
        portfolio_value=100_000,
        daily_pnl=0,
        weekly_pnl=0,
        live_order=True,
    )

    assert not allowed
    assert any("Live trading is disabled" in reason for reason in reasons)


def test_risk_manager_blocks_oversized_risk(db_session):
    settings = get_or_create_risk_settings(db_session)
    settings.allow_after_hours = True
    db_session.commit()

    order = OrderRequest(symbol="SPY", side="buy", order_type="market", quantity=100, stop_loss_price=50)
    allowed, reasons = TradingRiskManager().validate_order(
        db_session,
        order,
        execution_price=100,
        portfolio_value=100_000,
        daily_pnl=0,
        weekly_pnl=0,
    )

    assert not allowed
    assert any("per-trade limit" in reason for reason in reasons)


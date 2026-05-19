from app.domain.broker import PaperBrokerAdapter
from app.domain.market_data import MockMarketDataProvider
from app.domain.risk import get_or_create_risk_settings
from app.models import Position, Trade
from app.schemas import OrderRequest


def test_paper_broker_fills_buy_and_updates_position(db_session):
    risk = get_or_create_risk_settings(db_session)
    risk.allow_after_hours = True
    db_session.commit()

    market_data = MockMarketDataProvider()
    latest = market_data.get_latest_price("SPY")
    order = OrderRequest(
        symbol="SPY",
        side="buy",
        order_type="market",
        quantity=1,
        stop_loss_price=latest * 0.98,
    )
    result = PaperBrokerAdapter(db_session, market_data=market_data).place_order(order)

    assert result["status"] == "filled"
    position = db_session.query(Position).filter(Position.symbol == "SPY").one()
    assert position.quantity == 1
    assert db_session.query(Trade).filter(Trade.status == "filled").count() == 1


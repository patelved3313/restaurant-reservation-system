def test_dashboard_endpoint(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert body["portfolio_value"] > 0
    assert body["warning"].startswith("This app is for education")


def test_strategy_create_and_list(client):
    payload = {
        "name": "Test Crossover",
        "symbol": "SPY",
        "description": "Test strategy",
        "rules": {
            "strategy_type": "moving_average_crossover",
            "short_window": 10,
            "long_window": 30,
            "rsi_period": 14,
            "rsi_overbought": 70,
            "rsi_oversold": 30,
            "macd_fast": 12,
            "macd_slow": 26,
            "macd_signal": 9,
            "breakout_window": 20,
            "stop_loss_pct": 0.02,
            "take_profit_pct": 0.04,
            "position_size_pct": 0.1,
            "max_daily_loss": 0.03,
            "max_open_trades": 3,
            "reinvest_profits": True,
        },
    }

    create_response = client.post("/api/strategies", json=payload)
    assert create_response.status_code == 200
    list_response = client.get("/api/strategies")
    assert list_response.status_code == 200
    assert any(strategy["name"] == "Test Crossover" for strategy in list_response.json())


def test_strategy_update(client):
    payload = {
        "name": "Editable Strategy",
        "symbol": "SPY",
        "description": "Before",
        "rules": {
            "strategy_type": "moving_average_crossover",
            "short_window": 10,
            "long_window": 30,
            "rsi_period": 14,
            "rsi_overbought": 70,
            "rsi_oversold": 30,
            "macd_fast": 12,
            "macd_slow": 26,
            "macd_signal": 9,
            "breakout_window": 20,
            "daily_drop_pct": 0.05,
            "hold_days": 5,
            "fixed_position_notional": None,
            "stop_loss_pct": 0.02,
            "take_profit_pct": 0.04,
            "position_size_pct": 0.1,
            "max_daily_loss": 0.03,
            "max_open_trades": 3,
            "reinvest_profits": True,
        },
    }
    created = client.post("/api/strategies", json=payload).json()
    payload["name"] = "Edited Strategy"
    payload["symbol"] = "NVDA"
    payload["description"] = "After"
    payload["status"] = "paused"
    payload["rules"]["short_window"] = 12

    update_response = client.put(f"/api/strategies/{created['id']}", json=payload)

    assert update_response.status_code == 200
    body = update_response.json()
    assert body["name"] == "Edited Strategy"
    assert body["symbol"] == "NVDA"
    assert body["status"] == "paused"
    assert body["rules"]["short_window"] == 12


def test_paper_order_rejection_is_audited(client):
    response = client.post(
        "/api/orders/paper",
        json={"symbol": "SPY", "side": "buy", "order_type": "market", "quantity": 1},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"

    logs = client.get("/api/logs").json()
    assert any(log["event_type"] == "ORDER_REJECTED" for log in logs)


def test_market_data_endpoint(client):
    response = client.get("/api/market-data/SPY?start_date=2024-01-01&end_date=2024-02-01")

    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "SPY"
    assert body["candles"]
    assert "daily_return" in body["candles"][0]
    assert body["summary"]["last_close"] > 0

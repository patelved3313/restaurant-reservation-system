from app.domain.backtest import BacktestEngine


def test_backtest_generates_metrics_and_risk_capped_trades():
    closes = [100, 99, 98, 99, 101, 103, 104, 102, 100, 98, 99, 101, 104, 106]
    candles = [
        {"date": f"2024-01-{index + 1:02d}", "open": close, "high": close + 1, "low": close - 1, "close": close, "volume": 1000}
        for index, close in enumerate(closes)
    ]
    result = BacktestEngine().run(
        candles,
        {
            "strategy_type": "moving_average_crossover",
            "short_window": 2,
            "long_window": 3,
            "stop_loss_pct": 0.02,
            "take_profit_pct": 0.04,
            "position_size_pct": 0.2,
            "max_risk_per_trade": 0.02,
        },
        starting_cash=100_000,
    )

    assert result["ending_cash"] > 0
    assert "sharpe_ratio" in result["metrics"]
    assert len(result["equity_curve"]) == len(candles)
    buy_trades = [trade for trade in result["trades"] if trade["side"] == "buy"]
    assert buy_trades
    assert all(trade["risk_pct"] <= 0.02 for trade in buy_trades)


def test_daily_drop_hold_buys_drop_and_exits_after_hold_days():
    closes = [100, 94, 95, 96, 97, 98, 99]
    candles = [
        {"date": f"2024-01-{index + 1:02d}", "open": close, "high": close + 1, "low": close - 1, "close": close, "volume": 1000}
        for index, close in enumerate(closes)
    ]

    result = BacktestEngine().run(
        candles,
        {
            "strategy_type": "daily_drop_hold",
            "daily_drop_pct": 0.05,
            "hold_days": 5,
            "fixed_position_notional": 500,
            "position_size_pct": 0.005,
            "stop_loss_pct": 0.10,
            "max_risk_per_trade": 0.02,
        },
        starting_cash=100_000,
    )

    assert result["metrics"]["trade_count"] == 2
    assert result["trades"][0]["reason"] == "daily_drop"
    assert result["trades"][1]["reason"] == "time_exit"
    assert result["trades"][1]["held_days"] == 5

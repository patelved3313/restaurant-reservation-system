from app.domain.indicators import relative_strength_index, simple_moving_average
from app.domain.strategies import RuleBasedStrategyEngine


def test_simple_moving_average():
    assert simple_moving_average([1, 2, 3, 4], 2) == [None, 1.5, 2.5, 3.5]


def test_rsi_outputs_bounded_values():
    values = [44, 45, 43, 46, 48, 49, 47, 46, 50, 51, 52, 50, 49, 53, 55, 54]
    rsi = relative_strength_index(values, 14)
    bounded = [value for value in rsi if value is not None]
    assert bounded
    assert all(0 <= value <= 100 for value in bounded)


def test_strategy_generates_moving_average_signal():
    candles = [
        {"date": f"2024-01-{index + 1:02d}", "open": close, "high": close + 1, "low": close - 1, "close": close, "volume": 1000}
        for index, close in enumerate([10, 9, 8, 9, 10, 11, 12])
    ]
    signals = RuleBasedStrategyEngine().generate_signals(
        candles,
        {"strategy_type": "moving_average_crossover", "short_window": 2, "long_window": 3},
    )
    assert any(signal["signal"] == "buy" for signal in signals)


from __future__ import annotations

from typing import Any

from app.domain.indicators import macd, relative_strength_index, simple_moving_average
from app.domain.interfaces import StrategyEngine


class RuleBasedStrategyEngine(StrategyEngine):
    def generate_signals(self, candles: list[dict[str, Any]], rules: dict[str, Any]) -> list[dict[str, Any]]:
        closes = [float(candle["close"]) for candle in candles]
        strategy_type = rules.get("strategy_type", "moving_average_crossover")
        signals = [{"date": candle["date"], "signal": "hold", "price": float(candle["close"])} for candle in candles]

        if strategy_type == "moving_average_crossover":
            self._moving_average_crossover(signals, closes, int(rules.get("short_window", 20)), int(rules.get("long_window", 50)))
        elif strategy_type == "rsi":
            self._rsi(
                signals,
                closes,
                int(rules.get("rsi_period", 14)),
                float(rules.get("rsi_oversold", 30)),
                float(rules.get("rsi_overbought", 70)),
            )
        elif strategy_type == "macd":
            self._macd(
                signals,
                closes,
                int(rules.get("macd_fast", 12)),
                int(rules.get("macd_slow", 26)),
                int(rules.get("macd_signal", 9)),
            )
        elif strategy_type == "price_breakout":
            self._price_breakout(signals, candles, int(rules.get("breakout_window", 20)))
        elif strategy_type == "daily_drop_hold":
            self._daily_drop_hold(signals, closes, float(rules.get("daily_drop_pct", 0.05)))
        else:
            raise ValueError(f"Unsupported strategy type: {strategy_type}")

        return signals

    @staticmethod
    def _moving_average_crossover(signals: list[dict[str, Any]], closes: list[float], short_window: int, long_window: int) -> None:
        short_ma = simple_moving_average(closes, short_window)
        long_ma = simple_moving_average(closes, long_window)
        for index in range(1, len(closes)):
            prev_short, prev_long = short_ma[index - 1], long_ma[index - 1]
            curr_short, curr_long = short_ma[index], long_ma[index]
            if None in (prev_short, prev_long, curr_short, curr_long):
                continue
            if prev_short <= prev_long and curr_short > curr_long:
                signals[index]["signal"] = "buy"
            elif prev_short >= prev_long and curr_short < curr_long:
                signals[index]["signal"] = "sell"

    @staticmethod
    def _rsi(signals: list[dict[str, Any]], closes: list[float], period: int, oversold: float, overbought: float) -> None:
        rsi_values = relative_strength_index(closes, period)
        for index, value in enumerate(rsi_values):
            if value is None:
                continue
            if value <= oversold:
                signals[index]["signal"] = "buy"
            elif value >= overbought:
                signals[index]["signal"] = "sell"

    @staticmethod
    def _macd(signals: list[dict[str, Any]], closes: list[float], fast: int, slow: int, signal_window: int) -> None:
        macd_line, signal_line = macd(closes, fast, slow, signal_window)
        for index in range(1, len(closes)):
            prev_macd, prev_signal = macd_line[index - 1], signal_line[index - 1]
            curr_macd, curr_signal = macd_line[index], signal_line[index]
            if None in (prev_macd, prev_signal, curr_macd, curr_signal):
                continue
            if prev_macd <= prev_signal and curr_macd > curr_signal:
                signals[index]["signal"] = "buy"
            elif prev_macd >= prev_signal and curr_macd < curr_signal:
                signals[index]["signal"] = "sell"

    @staticmethod
    def _price_breakout(signals: list[dict[str, Any]], candles: list[dict[str, Any]], window: int) -> None:
        for index in range(window, len(candles)):
            previous = candles[index - window : index]
            previous_high = max(float(candle["high"]) for candle in previous)
            previous_low = min(float(candle["low"]) for candle in previous)
            close = float(candles[index]["close"])
            if close > previous_high:
                signals[index]["signal"] = "buy"
            elif close < previous_low:
                signals[index]["signal"] = "sell"

    @staticmethod
    def _daily_drop_hold(signals: list[dict[str, Any]], closes: list[float], daily_drop_pct: float) -> None:
        for index in range(1, len(closes)):
            previous_close = closes[index - 1]
            if previous_close <= 0:
                continue
            daily_return = (closes[index] - previous_close) / previous_close
            if daily_return <= -daily_drop_pct:
                signals[index]["signal"] = "buy"

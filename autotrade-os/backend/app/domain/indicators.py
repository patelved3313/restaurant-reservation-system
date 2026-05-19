from __future__ import annotations


def simple_moving_average(values: list[float], window: int) -> list[float | None]:
    if window <= 0:
        raise ValueError("window must be positive")
    output: list[float | None] = []
    rolling_sum = 0.0
    for index, value in enumerate(values):
        rolling_sum += value
        if index >= window:
            rolling_sum -= values[index - window]
        output.append(rolling_sum / window if index >= window - 1 else None)
    return output


def exponential_moving_average(values: list[float], window: int) -> list[float | None]:
    if window <= 0:
        raise ValueError("window must be positive")
    if not values:
        return []
    alpha = 2 / (window + 1)
    output: list[float | None] = []
    ema: float | None = None
    for index, value in enumerate(values):
        if index < window - 1:
            output.append(None)
            continue
        if ema is None:
            ema = sum(values[index - window + 1 : index + 1]) / window
        else:
            ema = (value - ema) * alpha + ema
        output.append(ema)
    return output


def relative_strength_index(values: list[float], period: int = 14) -> list[float | None]:
    if period <= 0:
        raise ValueError("period must be positive")
    if len(values) < period + 1:
        return [None for _ in values]

    rsi: list[float | None] = [None for _ in values]
    gains: list[float] = []
    losses: list[float] = []

    for index in range(1, period + 1):
        change = values[index] - values[index - 1]
        gains.append(max(change, 0))
        losses.append(abs(min(change, 0)))

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    rsi[period] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + avg_gain / avg_loss))

    for index in range(period + 1, len(values)):
        change = values[index] - values[index - 1]
        gain = max(change, 0)
        loss = abs(min(change, 0))
        avg_gain = ((avg_gain * (period - 1)) + gain) / period
        avg_loss = ((avg_loss * (period - 1)) + loss) / period
        rsi[index] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + avg_gain / avg_loss))

    return rsi


def macd(values: list[float], fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[list[float | None], list[float | None]]:
    fast_ema = exponential_moving_average(values, fast)
    slow_ema = exponential_moving_average(values, slow)
    macd_line: list[float | None] = []
    compact_macd: list[float] = []

    for fast_value, slow_value in zip(fast_ema, slow_ema):
        if fast_value is None or slow_value is None:
            macd_line.append(None)
        else:
            value = fast_value - slow_value
            macd_line.append(value)
            compact_macd.append(value)

    compact_signal = exponential_moving_average(compact_macd, signal)
    signal_line: list[float | None] = []
    signal_iter = iter(compact_signal)
    for value in macd_line:
        if value is None:
            signal_line.append(None)
        else:
            signal_line.append(next(signal_iter))
    return macd_line, signal_line


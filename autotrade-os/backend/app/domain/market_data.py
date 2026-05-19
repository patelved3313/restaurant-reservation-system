from __future__ import annotations

import math
import random
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from app.domain.interfaces import MarketDataProvider


class MockMarketDataProvider(MarketDataProvider):
    """Deterministic market data for simulation, UI demos, and tests."""

    def get_ohlcv(self, symbol: str, start: date, end: date) -> list[dict[str, Any]]:
        seed = sum(ord(char) for char in symbol.upper())
        random.seed(seed)
        base_price = 80 + (seed % 120)
        price = float(base_price)
        candles: list[dict[str, Any]] = []
        current = start
        index = 0

        while current <= end:
            if current.weekday() >= 5:
                current += timedelta(days=1)
                continue
            drift = math.sin(index / 12) * 0.7 + 0.08
            shock = random.uniform(-1.1, 1.1)
            open_price = max(price, 1.0)
            close_price = max(open_price + drift + shock, 1.0)
            high_price = max(open_price, close_price) + random.uniform(0.1, 1.5)
            low_price = max(min(open_price, close_price) - random.uniform(0.1, 1.5), 0.5)
            candles.append(
                {
                    "date": current.isoformat(),
                    "open": round(open_price, 2),
                    "high": round(high_price, 2),
                    "low": round(low_price, 2),
                    "close": round(close_price, 2),
                    "volume": int(1_000_000 + random.random() * 5_000_000),
                }
            )
            price = close_price
            current += timedelta(days=1)
            index += 1

        return candles

    def get_latest_price(self, symbol: str) -> float:
        today = date.today()
        candles = self.get_ohlcv(symbol, today - timedelta(days=45), today)
        return float(candles[-1]["close"])


class HistoricalDataProvider(MarketDataProvider):
    def __init__(self, fallback: MarketDataProvider | None = None) -> None:
        self.fallback = fallback or MockMarketDataProvider()

    def get_ohlcv(self, symbol: str, start: date, end: date) -> list[dict[str, Any]]:
        try:
            import yfinance as yf

            data = yf.download(symbol, start=start.isoformat(), end=(end + timedelta(days=1)).isoformat(), progress=False)
            if data.empty:
                return self._get_yahoo_chart_ohlcv(symbol, start, end)
            candles: list[dict[str, Any]] = []
            for index, row in data.iterrows():
                candles.append(
                    {
                        "date": index.date().isoformat(),
                        "open": round(float(row["Open"]), 4),
                        "high": round(float(row["High"]), 4),
                        "low": round(float(row["Low"]), 4),
                        "close": round(float(row["Close"]), 4),
                        "volume": int(row["Volume"]),
                    }
                )
            return candles
        except Exception:
            return self._get_yahoo_chart_ohlcv(symbol, start, end)

    def get_latest_price(self, symbol: str) -> float:
        today = date.today()
        return float(self.get_ohlcv(symbol, today - timedelta(days=10), today)[-1]["close"])

    def _get_yahoo_chart_ohlcv(self, symbol: str, start: date, end: date) -> list[dict[str, Any]]:
        try:
            period1 = int(datetime.combine(start, time.min, tzinfo=UTC).timestamp())
            period2 = int(datetime.combine(end + timedelta(days=1), time.min, tzinfo=UTC).timestamp())
            query = urlencode(
                {
                    "period1": period1,
                    "period2": period2,
                    "interval": "1d",
                    "events": "history",
                    "includeAdjustedClose": "true",
                }
            )
            request = Request(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}?{query}",
                headers={"User-Agent": "AutoTrade OS paper research"},
            )
            with urlopen(request, timeout=20) as response:
                body = json.loads(response.read().decode("utf-8"))
            result = body["chart"]["result"][0]
            timestamps = result.get("timestamp", [])
            quote = result["indicators"]["quote"][0]
            candles: list[dict[str, Any]] = []
            for index, timestamp in enumerate(timestamps):
                close = quote["close"][index]
                if close is None:
                    continue
                candles.append(
                    {
                        "date": datetime.fromtimestamp(timestamp, UTC).date().isoformat(),
                        "open": round(float(quote["open"][index]), 4),
                        "high": round(float(quote["high"][index]), 4),
                        "low": round(float(quote["low"][index]), 4),
                        "close": round(float(close), 4),
                        "volume": int(quote["volume"][index] or 0),
                    }
                )
            return candles or self.fallback.get_ohlcv(symbol, start, end)
        except Exception:
            return self.fallback.get_ohlcv(symbol, start, end)

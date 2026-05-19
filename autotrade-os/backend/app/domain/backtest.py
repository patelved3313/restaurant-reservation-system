from __future__ import annotations

import math
import statistics
from typing import Any

from app.domain.strategies import RuleBasedStrategyEngine


class BacktestEngine:
    def __init__(self, strategy_engine: RuleBasedStrategyEngine | None = None) -> None:
        self.strategy_engine = strategy_engine or RuleBasedStrategyEngine()

    def run(
        self,
        candles: list[dict[str, Any]],
        rules: dict[str, Any],
        starting_cash: float,
        fees_bps: float = 1.0,
        slippage_bps: float = 2.0,
    ) -> dict[str, Any]:
        if len(candles) < 2:
            raise ValueError("At least two candles are required to run a backtest")

        if rules.get("strategy_type") == "daily_drop_hold":
            return self._run_daily_drop_hold(candles, rules, starting_cash, fees_bps, slippage_bps)

        signals = self.strategy_engine.generate_signals(candles, rules)
        cash = float(starting_cash)
        quantity = 0.0
        entry_price = 0.0
        trades: list[dict[str, Any]] = []
        equity_curve: list[dict[str, Any]] = []
        stop_loss_pct = float(rules.get("stop_loss_pct", 0.02))
        take_profit_pct = float(rules.get("take_profit_pct", 0.04))
        position_size_pct = float(rules.get("position_size_pct", 0.1))
        max_risk_pct = min(float(rules.get("max_risk_per_trade", 0.02)), 0.02)

        for index, candle in enumerate(candles):
            close = float(candle["close"])
            high = float(candle["high"])
            low = float(candle["low"])
            date_value = str(candle["date"])
            portfolio_value = cash + quantity * close

            if quantity > 0:
                stop_price = entry_price * (1 - stop_loss_pct)
                take_profit_price = entry_price * (1 + take_profit_pct)
                exit_reason: str | None = None
                exit_price = close
                if low <= stop_price:
                    exit_reason = "stop_loss"
                    exit_price = stop_price
                elif high >= take_profit_price:
                    exit_reason = "take_profit"
                    exit_price = take_profit_price
                elif signals[index]["signal"] == "sell":
                    exit_reason = "signal"

                if exit_reason:
                    execution_price = exit_price * (1 - slippage_bps / 10_000)
                    gross = quantity * execution_price
                    fees = gross * fees_bps / 10_000
                    pnl = (execution_price - entry_price) * quantity - fees
                    cash += gross - fees
                    trades.append(
                        {
                            "date": date_value,
                            "side": "sell",
                            "quantity": round(quantity, 6),
                            "price": round(execution_price, 4),
                            "fees": round(fees, 4),
                            "pnl": round(pnl, 4),
                            "reason": exit_reason,
                        }
                    )
                    quantity = 0.0
                    entry_price = 0.0

            if quantity == 0 and signals[index]["signal"] == "buy":
                execution_price = close * (1 + slippage_bps / 10_000)
                risk_per_share = max(execution_price * stop_loss_pct, 0.01)
                risk_capped_qty = (portfolio_value * max_risk_pct) / risk_per_share
                target_notional_qty = (portfolio_value * position_size_pct) / execution_price
                desired_quantity = max(min(risk_capped_qty, target_notional_qty), 0.0)
                gross = desired_quantity * execution_price
                fees = gross * fees_bps / 10_000
                if desired_quantity > 0 and gross + fees <= cash:
                    cash -= gross + fees
                    quantity = desired_quantity
                    entry_price = execution_price
                    trades.append(
                        {
                            "date": date_value,
                            "side": "buy",
                            "quantity": round(quantity, 6),
                            "price": round(execution_price, 4),
                            "fees": round(fees, 4),
                            "risk_pct": round((risk_per_share * quantity) / max(portfolio_value, 1), 6),
                            "reason": "signal",
                        }
                    )

            mark_value = cash + quantity * close
            equity_curve.append({"date": date_value, "value": round(mark_value, 2)})

        if quantity > 0:
            last = candles[-1]
            close = float(last["close"])
            execution_price = close * (1 - slippage_bps / 10_000)
            gross = quantity * execution_price
            fees = gross * fees_bps / 10_000
            pnl = (execution_price - entry_price) * quantity - fees
            cash += gross - fees
            trades.append(
                {
                    "date": str(last["date"]),
                    "side": "sell",
                    "quantity": round(quantity, 6),
                    "price": round(execution_price, 4),
                    "fees": round(fees, 4),
                    "pnl": round(pnl, 4),
                    "reason": "end_of_backtest",
                }
            )
            equity_curve[-1]["value"] = round(cash, 2)

        ending_cash = round(cash, 2)
        metrics = calculate_metrics(starting_cash, ending_cash, equity_curve, trades)
        return {
            "starting_cash": round(starting_cash, 2),
            "ending_cash": ending_cash,
            "metrics": metrics,
            "trades": trades,
            "equity_curve": equity_curve,
        }

    def _run_daily_drop_hold(
        self,
        candles: list[dict[str, Any]],
        rules: dict[str, Any],
        starting_cash: float,
        fees_bps: float,
        slippage_bps: float,
    ) -> dict[str, Any]:
        cash = float(starting_cash)
        lots: list[dict[str, Any]] = []
        trades: list[dict[str, Any]] = []
        equity_curve: list[dict[str, Any]] = []
        daily_drop_pct = float(rules.get("daily_drop_pct", 0.05))
        hold_days = int(rules.get("hold_days", 5))
        fixed_notional = rules.get("fixed_position_notional")
        position_size_pct = float(rules.get("position_size_pct", 0.005))
        stop_loss_pct = float(rules.get("stop_loss_pct", 0.08))
        max_risk_pct = min(float(rules.get("max_risk_per_trade", 0.02)), 0.02)

        for index, candle in enumerate(candles):
            close = float(candle["close"])
            low = float(candle["low"])
            date_value = str(candle["date"])

            remaining_lots: list[dict[str, Any]] = []
            for lot in lots:
                exit_reason: str | None = None
                exit_price = close
                stop_price = lot["entry_price"] * (1 - stop_loss_pct)
                if low <= stop_price:
                    exit_reason = "stop_loss"
                    exit_price = stop_price
                elif index - lot["entry_index"] >= hold_days:
                    exit_reason = "time_exit"

                if exit_reason:
                    execution_price = exit_price * (1 - slippage_bps / 10_000)
                    gross = lot["quantity"] * execution_price
                    fees = gross * fees_bps / 10_000
                    pnl = (execution_price - lot["entry_price"]) * lot["quantity"] - lot["entry_fees"] - fees
                    cash += gross - fees
                    trades.append(
                        {
                            "date": date_value,
                            "side": "sell",
                            "quantity": round(lot["quantity"], 6),
                            "price": round(execution_price, 4),
                            "fees": round(fees, 4),
                            "pnl": round(pnl, 4),
                            "reason": exit_reason,
                            "held_days": index - lot["entry_index"],
                        }
                    )
                else:
                    remaining_lots.append(lot)
            lots = remaining_lots

            portfolio_value = cash + sum(lot["quantity"] * close for lot in lots)
            if index > 0:
                previous_close = float(candles[index - 1]["close"])
                daily_return = (close - previous_close) / previous_close if previous_close else 0.0
                if daily_return <= -daily_drop_pct:
                    execution_price = close * (1 + slippage_bps / 10_000)
                    requested_notional = float(fixed_notional or portfolio_value * position_size_pct)
                    risk_capped_notional = portfolio_value * max_risk_pct / max(stop_loss_pct, 0.0001)
                    notional = min(requested_notional, risk_capped_notional, cash)
                    quantity = notional / execution_price if execution_price else 0.0
                    gross = quantity * execution_price
                    fees = gross * fees_bps / 10_000
                    if quantity > 0 and gross + fees <= cash:
                        cash -= gross + fees
                        lots.append(
                            {
                                "quantity": quantity,
                                "entry_price": execution_price,
                                "entry_fees": fees,
                                "entry_index": index,
                                "entry_date": date_value,
                            }
                        )
                        trades.append(
                            {
                                "date": date_value,
                                "side": "buy",
                                "quantity": round(quantity, 6),
                                "price": round(execution_price, 4),
                                "fees": round(fees, 4),
                                "daily_return": round(daily_return, 6),
                                "notional": round(gross, 2),
                                "risk_pct": round((gross * stop_loss_pct) / max(portfolio_value, 1), 6),
                                "reason": "daily_drop",
                            }
                        )

            mark_value = cash + sum(lot["quantity"] * close for lot in lots)
            equity_curve.append({"date": date_value, "value": round(mark_value, 2)})

        if lots:
            last = candles[-1]
            close = float(last["close"])
            date_value = str(last["date"])
            for lot in lots:
                execution_price = close * (1 - slippage_bps / 10_000)
                gross = lot["quantity"] * execution_price
                fees = gross * fees_bps / 10_000
                pnl = (execution_price - lot["entry_price"]) * lot["quantity"] - lot["entry_fees"] - fees
                cash += gross - fees
                trades.append(
                    {
                        "date": date_value,
                        "side": "sell",
                        "quantity": round(lot["quantity"], 6),
                        "price": round(execution_price, 4),
                        "fees": round(fees, 4),
                        "pnl": round(pnl, 4),
                        "reason": "end_of_backtest",
                        "held_days": len(candles) - 1 - lot["entry_index"],
                    }
                )
            equity_curve[-1]["value"] = round(cash, 2)

        ending_cash = round(cash, 2)
        metrics = calculate_metrics(starting_cash, ending_cash, equity_curve, trades)
        return {
            "starting_cash": round(starting_cash, 2),
            "ending_cash": ending_cash,
            "metrics": metrics,
            "trades": trades,
            "equity_curve": equity_curve,
        }


def calculate_metrics(
    starting_cash: float,
    ending_cash: float,
    equity_curve: list[dict[str, Any]],
    trades: list[dict[str, Any]],
) -> dict[str, Any]:
    values = [float(point["value"]) for point in equity_curve]
    returns = [(values[index] - values[index - 1]) / values[index - 1] for index in range(1, len(values)) if values[index - 1]]
    total_return = (ending_cash - starting_cash) / starting_cash if starting_cash else 0.0
    years = max(len(values) / 252, 1 / 252)
    cagr = (ending_cash / starting_cash) ** (1 / years) - 1 if starting_cash and ending_cash > 0 else 0.0
    sharpe = 0.0
    if len(returns) > 1 and statistics.pstdev(returns) > 0:
        sharpe = statistics.mean(returns) / statistics.pstdev(returns) * math.sqrt(252)

    peak = values[0] if values else starting_cash
    max_drawdown = 0.0
    for value in values:
        peak = max(peak, value)
        if peak:
            max_drawdown = min(max_drawdown, (value - peak) / peak)

    sell_trades = [trade for trade in trades if trade["side"] == "sell"]
    wins = [float(trade.get("pnl", 0)) for trade in sell_trades if float(trade.get("pnl", 0)) > 0]
    losses = [float(trade.get("pnl", 0)) for trade in sell_trades if float(trade.get("pnl", 0)) < 0]
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))

    return {
        "total_return": round(total_return, 6),
        "cagr": round(cagr, 6),
        "sharpe_ratio": round(sharpe, 6),
        "max_drawdown": round(abs(max_drawdown), 6),
        "win_rate": round(len(wins) / len(sell_trades), 6) if sell_trades else 0.0,
        "average_win": round(statistics.mean(wins), 4) if wins else 0.0,
        "average_loss": round(statistics.mean(losses), 4) if losses else 0.0,
        "profit_factor": round(gross_profit / gross_loss, 6) if gross_loss else (round(gross_profit, 6) if gross_profit else 0.0),
        "trade_count": len(trades),
    }

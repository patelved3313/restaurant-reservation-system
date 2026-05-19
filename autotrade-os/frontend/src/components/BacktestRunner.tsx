"use client";

import { FormEvent, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { postJson } from "@/lib/clientApi";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { Backtest, Strategy } from "@/lib/types";

export function BacktestRunner({ strategies }: { strategies: Strategy[] }) {
  const [result, setResult] = useState<Backtest | null>(null);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const strategyId = String(form.get("strategy_id") || "");
    const payload = strategyId
      ? {
          strategy_id: Number(strategyId),
          start_date: String(form.get("start_date")),
          end_date: String(form.get("end_date")),
          starting_cash: Number(form.get("starting_cash")),
          fees_bps: Number(form.get("fees_bps")),
          slippage_bps: Number(form.get("slippage_bps"))
        }
      : {
          symbol: String(form.get("symbol")),
          start_date: String(form.get("start_date")),
          end_date: String(form.get("end_date")),
          starting_cash: Number(form.get("starting_cash")),
          fees_bps: Number(form.get("fees_bps")),
          slippage_bps: Number(form.get("slippage_bps")),
          rules: {
            strategy_type: "moving_average_crossover",
            short_window: 20,
            long_window: 50,
            rsi_period: 14,
            rsi_overbought: 70,
            rsi_oversold: 30,
            macd_fast: 12,
            macd_slow: 26,
            macd_signal: 9,
            breakout_window: 20,
            daily_drop_pct: 0.05,
            hold_days: 5,
            fixed_position_notional: null,
            stop_loss_pct: 0.02,
            take_profit_pct: 0.04,
            position_size_pct: 0.1,
            max_daily_loss: 0.03,
            max_open_trades: 3,
            reinvest_profits: true
          }
        };

    try {
      const response = await postJson<Backtest>("/backtest", payload);
      setResult(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Backtest failed.");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
      <form onSubmit={onSubmit} className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
        <div className="space-y-3">
          <label>
            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">Saved Strategy</span>
            <select name="strategy_id" className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent">
              <option value="">Inline MA strategy</option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name} · {strategy.symbol}
                </option>
              ))}
            </select>
          </label>
          <Field name="symbol" label="Inline Symbol" defaultValue="SPY" />
          <Field name="start_date" label="Start Date" type="date" defaultValue="2023-01-01" />
          <Field name="end_date" label="End Date" type="date" defaultValue="2025-12-31" />
          <Field name="starting_cash" label="Starting Cash" type="number" defaultValue="100000" />
          <Field name="fees_bps" label="Fees BPS" type="number" defaultValue="1" />
          <Field name="slippage_bps" label="Slippage BPS" type="number" defaultValue="2" />
        </div>
        <button className="mt-4 rounded bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent">Run Backtest</button>
        {message ? <div className="mt-3 text-sm text-loss">{message}</div> : null}
      </form>

      <section className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
        {result ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <Metric label="Return" value={formatPercent(result.metrics.total_return || 0)} />
              <Metric label="Sharpe" value={(result.metrics.sharpe_ratio || 0).toFixed(2)} />
              <Metric label="Drawdown" value={formatPercent(result.metrics.max_drawdown || 0)} />
              <Metric label="Trades" value={String(result.metrics.trade_count || 0)} />
            </div>
            <div className="h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equity_curve}>
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#0b0d10", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4 }}
                    formatter={(value) => [formatCurrency(Number(value)), "Equity"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#5ed4ff" fill="#5ed4ff22" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="grid min-h-[360px] place-items-center text-center text-slate-500">
            <div>
              <div className="text-lg font-medium text-slate-300">Backtest output</div>
              <div className="mt-2 text-sm">Run a paper simulation to populate metrics and equity curve.</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue?: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent" required />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/50 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

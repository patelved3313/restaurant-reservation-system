"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/clientApi";

export function StrategyForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const strategyType = String(form.get("strategy_type"));
    const payload = {
      name: String(form.get("name")),
      description: String(form.get("description") || ""),
      symbol: String(form.get("symbol")),
      rules: {
        strategy_type: strategyType,
        short_window: Number(form.get("short_window")),
        long_window: Number(form.get("long_window")),
        rsi_period: Number(form.get("rsi_period")),
        rsi_overbought: Number(form.get("rsi_overbought")),
        rsi_oversold: Number(form.get("rsi_oversold")),
        macd_fast: 12,
        macd_slow: 26,
        macd_signal: 9,
        breakout_window: Number(form.get("breakout_window")),
        daily_drop_pct: Number(form.get("daily_drop_pct")) / 100,
        hold_days: Number(form.get("hold_days")),
        fixed_position_notional: Number(form.get("fixed_position_notional")) > 0 ? Number(form.get("fixed_position_notional")) : null,
        stop_loss_pct: Number(form.get("stop_loss_pct")) / 100,
        take_profit_pct: Number(form.get("take_profit_pct")) / 100,
        position_size_pct: Number(form.get("position_size_pct")) / 100,
        max_daily_loss: Number(form.get("max_daily_loss")) / 100,
        max_open_trades: Number(form.get("max_open_trades")),
        reinvest_profits: form.get("reinvest_profits") === "on"
      }
    };

    try {
      await postJson("/strategies", payload);
      setMessage("Strategy saved.");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save strategy.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="name" label="Name" defaultValue="MA Crossover" />
        <Field name="symbol" label="Symbol" defaultValue="SPY" />
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">Description</span>
          <textarea name="description" rows={3} className="w-full rounded border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-accent" />
        </label>
        <Select name="strategy_type" label="Strategy" options={["moving_average_crossover", "rsi", "macd", "price_breakout", "daily_drop_hold"]} />
        <Field name="position_size_pct" label="Position Size %" type="number" defaultValue="10" />
        <Field name="short_window" label="Short MA" type="number" defaultValue="20" />
        <Field name="long_window" label="Long MA" type="number" defaultValue="50" />
        <Field name="rsi_period" label="RSI Period" type="number" defaultValue="14" />
        <Field name="rsi_oversold" label="RSI Oversold" type="number" defaultValue="30" />
        <Field name="rsi_overbought" label="RSI Overbought" type="number" defaultValue="70" />
        <Field name="breakout_window" label="Breakout Window" type="number" defaultValue="20" />
        <Field name="daily_drop_pct" label="Daily Drop Trigger %" type="number" defaultValue="5" step="0.1" />
        <Field name="hold_days" label="Hold Days" type="number" defaultValue="5" />
        <Field name="fixed_position_notional" label="Fixed Notional $" type="number" defaultValue="500" required={false} />
        <Field name="stop_loss_pct" label="Stop Loss %" type="number" defaultValue="2" step="0.1" />
        <Field name="take_profit_pct" label="Take Profit %" type="number" defaultValue="4" step="0.1" />
        <Field name="max_daily_loss" label="Max Daily Loss %" type="number" defaultValue="3" step="0.1" />
        <Field name="max_open_trades" label="Max Open Trades" type="number" defaultValue="3" />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
        <input name="reinvest_profits" type="checkbox" defaultChecked className="h-4 w-4 accent-accent" />
        Reinvest paper profits
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button className="rounded bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent">Save Strategy</button>
        {message ? <span className="text-sm text-slate-400">{message}</span> : null}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  step = "1",
  required = true
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent"
        required={required}
      />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select name={name} className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent">
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

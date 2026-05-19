"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, Save } from "lucide-react";
import { postJson, putJson } from "@/lib/clientApi";
import type { Strategy } from "@/lib/types";

type StrategyKind = "moving_average_crossover" | "rsi" | "macd" | "price_breakout" | "daily_drop_hold";

type FormState = {
  name: string;
  symbol: string;
  description: string;
  strategy_type: StrategyKind;
  status: "draft" | "active" | "paused" | "archived";
  position_size_pct: string;
  short_window: string;
  long_window: string;
  rsi_period: string;
  rsi_oversold: string;
  rsi_overbought: string;
  breakout_window: string;
  daily_drop_pct: string;
  hold_days: string;
  fixed_position_notional: string;
  stop_loss_pct: string;
  take_profit_pct: string;
  max_daily_loss: string;
  max_open_trades: string;
  reinvest_profits: boolean;
};

const strategyTypes: StrategyKind[] = ["moving_average_crossover", "rsi", "macd", "price_breakout", "daily_drop_hold"];
const statuses: FormState["status"][] = ["draft", "active", "paused", "archived"];

const blankForm: FormState = {
  name: "MA Crossover",
  symbol: "SPY",
  description: "",
  strategy_type: "moving_average_crossover",
  status: "draft",
  position_size_pct: "10",
  short_window: "20",
  long_window: "50",
  rsi_period: "14",
  rsi_oversold: "30",
  rsi_overbought: "70",
  breakout_window: "20",
  daily_drop_pct: "5",
  hold_days: "5",
  fixed_position_notional: "500",
  stop_loss_pct: "2",
  take_profit_pct: "4",
  max_daily_loss: "3",
  max_open_trades: "3",
  reinvest_profits: true
};

export function StrategyManager({ initialStrategies }: { initialStrategies: Strategy[] }) {
  const router = useRouter();
  const [strategies, setStrategies] = useState(initialStrategies);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [message, setMessage] = useState("");

  const selectedStrategy = useMemo(
    () => strategies.find((strategy) => strategy.id === selectedId) ?? null,
    [selectedId, strategies]
  );

  function selectStrategy(strategy: Strategy | null) {
    setMessage("");
    setSelectedId(strategy?.id ?? null);
    setForm(strategy ? formFromStrategy(strategy) : blankForm);
  }

  function onChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const target = event.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
    setForm((current) => ({ ...current, [target.name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const payload = toPayload(form);

    try {
      if (selectedId) {
        const updated = await putJson<Strategy>(`/strategies/${selectedId}`, payload);
        setStrategies((current) => current.map((strategy) => (strategy.id === updated.id ? updated : strategy)));
        setForm(formFromStrategy(updated));
        setMessage("Strategy updated.");
      } else {
        const created = await postJson<Strategy>("/strategies", payload);
        setStrategies((current) => [created, ...current]);
        setSelectedId(created.id);
        setForm(formFromStrategy(created));
        setMessage("Strategy created.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save strategy.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="w-full lg:max-w-md">
            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">Saved Strategy</span>
            <select
              value={selectedId ?? ""}
              onChange={(event) => {
                const nextId = Number(event.target.value);
                selectStrategy(strategies.find((strategy) => strategy.id === nextId) ?? null);
              }}
              className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent"
            >
              <option value="">New strategy</option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name} - {strategy.symbol}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => selectStrategy(null)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Plus size={16} />
            New
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="name" label="Name" value={form.name} onChange={onChange} />
            <Field name="symbol" label="Symbol" value={form.symbol} onChange={onChange} />
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">Description</span>
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={onChange}
                className="w-full rounded border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <Select name="strategy_type" label="Strategy" value={form.strategy_type} options={strategyTypes} onChange={onChange} />
            <Select name="status" label="Status" value={form.status} options={statuses} onChange={onChange} />
            <Field name="position_size_pct" label="Position Size %" type="number" value={form.position_size_pct} onChange={onChange} />
            <Field name="short_window" label="Short MA" type="number" value={form.short_window} onChange={onChange} />
            <Field name="long_window" label="Long MA" type="number" value={form.long_window} onChange={onChange} />
            <Field name="rsi_period" label="RSI Period" type="number" value={form.rsi_period} onChange={onChange} />
            <Field name="rsi_oversold" label="RSI Oversold" type="number" value={form.rsi_oversold} onChange={onChange} />
            <Field name="rsi_overbought" label="RSI Overbought" type="number" value={form.rsi_overbought} onChange={onChange} />
            <Field name="breakout_window" label="Breakout Window" type="number" value={form.breakout_window} onChange={onChange} />
            <Field name="daily_drop_pct" label="Daily Drop Trigger %" type="number" step="0.1" value={form.daily_drop_pct} onChange={onChange} />
            <Field name="hold_days" label="Hold Days" type="number" value={form.hold_days} onChange={onChange} />
            <Field name="fixed_position_notional" label="Fixed Notional $" type="number" value={form.fixed_position_notional} onChange={onChange} required={false} />
            <Field name="stop_loss_pct" label="Stop Loss %" type="number" step="0.1" value={form.stop_loss_pct} onChange={onChange} />
            <Field name="take_profit_pct" label="Take Profit %" type="number" step="0.1" value={form.take_profit_pct} onChange={onChange} />
            <Field name="max_daily_loss" label="Max Daily Loss %" type="number" step="0.1" value={form.max_daily_loss} onChange={onChange} />
            <Field name="max_open_trades" label="Max Open Trades" type="number" value={form.max_open_trades} onChange={onChange} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <input name="reinvest_profits" type="checkbox" checked={form.reinvest_profits} onChange={onChange} className="h-4 w-4 accent-accent" />
            Reinvest paper profits
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent">
              <Save size={16} />
              {selectedStrategy ? "Save Changes" : "Create Strategy"}
            </button>
            {message ? <span className="text-sm text-slate-400">{message}</span> : null}
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded border border-white/10 bg-panel/90 shadow-glow">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold">Saved Strategies</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {strategies.map((strategy) => (
                <tr key={strategy.id} className={strategy.id === selectedId ? "bg-accent/10" : ""}>
                  <td className="px-4 py-3 font-medium text-white">{strategy.name}</td>
                  <td className="px-4 py-3">{strategy.symbol}</td>
                  <td className="px-4 py-3">{String(strategy.rules.strategy_type || "").replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{formatPercentRule(strategy.rules.stop_loss_pct)} stop</td>
                  <td className="px-4 py-3">{strategy.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => selectStrategy(strategy)}
                      className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:border-accent hover:text-accent"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {strategies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No strategies saved.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formFromStrategy(strategy: Strategy): FormState {
  const rules = strategy.rules;
  return {
    name: strategy.name,
    symbol: strategy.symbol,
    description: strategy.description ?? "",
    strategy_type: readString(rules.strategy_type, "moving_average_crossover") as StrategyKind,
    status: strategy.status as FormState["status"],
    position_size_pct: percentString(rules.position_size_pct, 0.1),
    short_window: readString(rules.short_window, "20"),
    long_window: readString(rules.long_window, "50"),
    rsi_period: readString(rules.rsi_period, "14"),
    rsi_oversold: readString(rules.rsi_oversold, "30"),
    rsi_overbought: readString(rules.rsi_overbought, "70"),
    breakout_window: readString(rules.breakout_window, "20"),
    daily_drop_pct: percentString(rules.daily_drop_pct, 0.05),
    hold_days: readString(rules.hold_days, "5"),
    fixed_position_notional: rules.fixed_position_notional ? readString(rules.fixed_position_notional, "500") : "",
    stop_loss_pct: percentString(rules.stop_loss_pct, 0.02),
    take_profit_pct: percentString(rules.take_profit_pct, 0.04),
    max_daily_loss: percentString(rules.max_daily_loss, 0.03),
    max_open_trades: readString(rules.max_open_trades, "3"),
    reinvest_profits: Boolean(rules.reinvest_profits ?? true)
  };
}

function toPayload(form: FormState) {
  const fixedNotional = Number(form.fixed_position_notional);
  return {
    name: form.name,
    symbol: form.symbol,
    description: form.description,
    status: form.status,
    rules: {
      strategy_type: form.strategy_type,
      short_window: Number(form.short_window),
      long_window: Number(form.long_window),
      rsi_period: Number(form.rsi_period),
      rsi_overbought: Number(form.rsi_overbought),
      rsi_oversold: Number(form.rsi_oversold),
      macd_fast: 12,
      macd_slow: 26,
      macd_signal: 9,
      breakout_window: Number(form.breakout_window),
      daily_drop_pct: Number(form.daily_drop_pct) / 100,
      hold_days: Number(form.hold_days),
      fixed_position_notional: fixedNotional > 0 ? fixedNotional : null,
      stop_loss_pct: Number(form.stop_loss_pct) / 100,
      take_profit_pct: Number(form.take_profit_pct) / 100,
      position_size_pct: Number(form.position_size_pct) / 100,
      max_daily_loss: Number(form.max_daily_loss) / 100,
      max_open_trades: Number(form.max_open_trades),
      reinvest_profits: form.reinvest_profits
    }
  };
}

function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  step = "1",
  required = true
}: {
  name: keyof FormState;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
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
        value={value}
        onChange={onChange}
        required={required}
        className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

function Select<T extends string>({
  name,
  label,
  value,
  options,
  onChange
}: {
  name: keyof FormState;
  label: string;
  value: T;
  options: T[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select name={name} value={value} onChange={onChange} className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent">
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function readString(value: unknown, fallback: string) {
  return value === undefined || value === null ? fallback : String(value);
}

function percentString(value: unknown, fallback: number) {
  return String(Number(value ?? fallback) * 100);
}

function formatPercentRule(value: unknown) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}


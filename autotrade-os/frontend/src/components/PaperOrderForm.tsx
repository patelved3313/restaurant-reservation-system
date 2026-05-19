"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Send } from "lucide-react";
import { postJson } from "@/lib/clientApi";

export function PaperOrderForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function control(path: string) {
    setMessage("");
    try {
      const response = await postJson<{ message: string }>(path);
      setMessage(response.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const limitPrice = Number(form.get("limit_price"));
    const takeProfit = Number(form.get("take_profit_price"));
    const payload = {
      symbol: String(form.get("symbol")),
      side: String(form.get("side")),
      order_type: String(form.get("order_type")),
      quantity: Number(form.get("quantity")),
      limit_price: limitPrice > 0 ? limitPrice : null,
      stop_loss_price: Number(form.get("stop_loss_price")),
      take_profit_price: takeProfit > 0 ? takeProfit : null
    };

    try {
      const response = await postJson<{ status: string; reasons?: string[] }>("/orders/paper", payload);
      setMessage(response.status === "rejected" ? `Rejected: ${response.reasons?.join(" ")}` : "Paper order filled.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order failed.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => control("/paper/start")} className="inline-flex items-center gap-2 rounded bg-profit px-3 py-2 text-sm font-semibold text-black">
          <Play size={16} />
          Start
        </button>
        <button type="button" onClick={() => control("/paper/stop")} className="inline-flex items-center gap-2 rounded bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15">
          <Pause size={16} />
          Stop
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="symbol" label="Symbol" defaultValue="SPY" />
        <Field name="quantity" label="Quantity" type="number" defaultValue="10" step="0.0001" />
        <Select name="side" label="Side" options={["buy", "sell"]} />
        <Select name="order_type" label="Order Type" options={["market", "limit"]} />
        <Field name="limit_price" label="Limit Price" type="number" defaultValue="" required={false} step="0.01" />
        <Field name="stop_loss_price" label="Stop Loss" type="number" defaultValue="50" step="0.01" />
        <Field name="take_profit_price" label="Take Profit" type="number" defaultValue="" required={false} step="0.01" />
      </div>
      <button className="mt-4 inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent">
        <Send size={16} />
        Send Paper Order
      </button>
      {message ? <div className="mt-3 text-sm text-slate-300">{message}</div> : null}
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
        defaultValue={defaultValue}
        step={step}
        required={required}
        className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent"
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
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

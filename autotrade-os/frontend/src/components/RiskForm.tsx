"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { postJson, putJson } from "@/lib/clientApi";
import type { RiskSettings } from "@/lib/types";

export function RiskForm({ risk }: { risk: RiskSettings }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      max_risk_per_trade: Number(form.get("max_risk_per_trade")) / 100,
      max_daily_loss: Number(form.get("max_daily_loss")) / 100,
      max_weekly_loss: Number(form.get("max_weekly_loss")) / 100,
      max_position_size: Number(form.get("max_position_size")) / 100,
      stop_loss_required: form.get("stop_loss_required") === "on",
      kill_switch_enabled: form.get("kill_switch_enabled") === "on",
      allow_after_hours: form.get("allow_after_hours") === "on"
    };
    try {
      await putJson("/risk", payload);
      setMessage("Risk settings saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update risk settings.");
    }
  }

  async function killSwitch() {
    setMessage("");
    try {
      const response = await postJson<{ message: string }>("/kill-switch");
      setMessage(response.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kill switch failed.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="max_risk_per_trade" label="Max Risk / Trade %" defaultValue={(risk.max_risk_per_trade * 100).toString()} max="2" />
        <Field name="max_daily_loss" label="Max Daily Loss %" defaultValue={(risk.max_daily_loss * 100).toString()} />
        <Field name="max_weekly_loss" label="Max Weekly Loss %" defaultValue={(risk.max_weekly_loss * 100).toString()} />
        <Field name="max_position_size" label="Max Position Size %" defaultValue={(risk.max_position_size * 100).toString()} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
        <Check name="stop_loss_required" label="Require stop-loss" defaultChecked={risk.stop_loss_required} />
        <Check name="kill_switch_enabled" label="Kill switch enabled" defaultChecked={risk.kill_switch_enabled} />
        <Check name="allow_after_hours" label="Allow after-hours paper orders" defaultChecked={risk.allow_after_hours} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="rounded bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent">Save Risk Rules</button>
        <button
          type="button"
          onClick={killSwitch}
          className="inline-flex items-center gap-2 rounded bg-loss px-4 py-2 text-sm font-semibold text-white"
        >
          <ShieldAlert size={16} />
          Kill Switch
        </button>
        {message ? <span className="text-sm text-slate-400">{message}</span> : null}
      </div>
    </form>
  );
}

function Field({ name, label, defaultValue, max = "100" }: { name: string; label: string; defaultValue: string; max?: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        name={name}
        type="number"
        step="0.1"
        min="0.1"
        max={max}
        defaultValue={defaultValue}
        className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent"
        required
      />
    </label>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded border border-white/10 bg-black/45 px-3 py-2">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-accent" />
      {label}
    </label>
  );
}


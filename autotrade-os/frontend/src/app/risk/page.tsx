import { RiskForm } from "@/components/RiskForm";
import { apiGet } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import type { RiskSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RiskPage() {
  const risk = await apiGet<RiskSettings>("/risk");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Risk</h1>
        <p className="mt-1 text-sm text-slate-500">Hard limits enforced before every paper order.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Risk / Trade</div>
          <div className="mt-2 text-xl font-semibold text-white">{formatPercent(risk.max_risk_per_trade)}</div>
        </div>
        <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Daily Loss</div>
          <div className="mt-2 text-xl font-semibold text-white">{formatPercent(risk.max_daily_loss)}</div>
        </div>
        <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Weekly Loss</div>
          <div className="mt-2 text-xl font-semibold text-white">{formatPercent(risk.max_weekly_loss)}</div>
        </div>
        <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Kill Switch</div>
          <div className={risk.kill_switch_enabled ? "mt-2 text-xl font-semibold text-loss" : "mt-2 text-xl font-semibold text-profit"}>
            {risk.kill_switch_enabled ? "Enabled" : "Clear"}
          </div>
        </div>
      </section>

      <RiskForm risk={risk} />
    </div>
  );
}


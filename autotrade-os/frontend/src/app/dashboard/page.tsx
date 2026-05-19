import { EquityChart } from "@/components/EquityChart";
import { StatCard } from "@/components/StatCard";
import { TradeTable } from "@/components/TradeTable";
import { apiGet } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await apiGet<Dashboard>("/dashboard");
  const dailyTone = dashboard.daily_pnl > 0 ? "profit" : dashboard.daily_pnl < 0 ? "loss" : "neutral";
  const returnTone = dashboard.total_return > 0 ? "profit" : dashboard.total_return < 0 ? "loss" : "neutral";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Simulation portfolio, paper trades, risk state, and equity curve.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Portfolio Value" value={formatCurrency(dashboard.portfolio_value)} tone="accent" />
        <StatCard label="Cash Balance" value={formatCurrency(dashboard.cash_balance)} />
        <StatCard label="Daily P/L" value={formatCurrency(dashboard.daily_pnl)} tone={dailyTone} />
        <StatCard label="Total Return" value={formatPercent(dashboard.total_return)} tone={returnTone} />
        <StatCard label="Open Positions" value={String(dashboard.open_positions)} />
        <StatCard label="Win Rate" value={formatPercent(dashboard.win_rate)} />
        <StatCard label="Max Drawdown" value={formatPercent(dashboard.max_drawdown)} tone={dashboard.max_drawdown > 0 ? "loss" : "neutral"} />
        <StatCard label="Mode" value="Paper" detail="Live trading disabled by default" tone="profit" />
      </section>

      <section className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Equity Curve</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Paper portfolio</span>
        </div>
        <EquityChart data={dashboard.equity_curve} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Trades</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Audit backed</span>
        </div>
        <TradeTable trades={dashboard.recent_trades} />
      </section>
    </div>
  );
}


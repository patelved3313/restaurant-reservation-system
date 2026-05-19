import { BacktestRunner } from "@/components/BacktestRunner";
import { apiGet } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { Backtest, Strategy } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BacktestPage() {
  const [strategies, backtests] = await Promise.all([
    apiGet<Strategy[]>("/strategies"),
    apiGet<Backtest[]>("/backtests")
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Backtest</h1>
        <p className="mt-1 text-sm text-slate-500">Historical simulation with fees, slippage, stop-loss, take-profit, and risk-capped sizing.</p>
      </div>

      <BacktestRunner strategies={strategies} />

      <section className="overflow-hidden rounded border border-white/10 bg-panel/90 shadow-glow">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold">Recent Backtests</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-right">Ending Cash</th>
                <th className="px-4 py-3 text-right">Return</th>
                <th className="px-4 py-3 text-right">Sharpe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {backtests.map((backtest) => (
                <tr key={backtest.id}>
                  <td className="px-4 py-3 font-medium text-white">{backtest.name}</td>
                  <td className="px-4 py-3">{backtest.start_date} to {backtest.end_date}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(backtest.ending_cash)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(backtest.metrics.total_return || 0)}</td>
                  <td className="px-4 py-3 text-right">{(backtest.metrics.sharpe_ratio || 0).toFixed(2)}</td>
                </tr>
              ))}
              {backtests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No backtests yet.
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

import { formatCurrency, formatDateTime, pnlClass } from "@/lib/format";
import type { Trade } from "@/lib/types";

export function TradeTable({ trades }: { trades: Trade[] }) {
  return (
    <div className="overflow-hidden rounded border border-white/10 bg-panel/90">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-left">Side</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">P/L</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {trades.map((trade) => {
              const pnl = Number(trade.details?.realized_pnl ?? 0);
              return (
                <tr key={trade.id} className="text-slate-300">
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(trade.timestamp)}</td>
                  <td className="px-4 py-3 font-medium text-white">{trade.symbol}</td>
                  <td className={trade.side === "buy" ? "px-4 py-3 text-profit" : "px-4 py-3 text-loss"}>{trade.side.toUpperCase()}</td>
                  <td className="px-4 py-3 text-right">{trade.quantity.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(trade.price)}</td>
                  <td className={`px-4 py-3 text-right ${pnlClass(pnl)}`}>{pnl ? formatCurrency(pnl) : "-"}</td>
                  <td className="px-4 py-3">{trade.status}</td>
                </tr>
              );
            })}
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No trades yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

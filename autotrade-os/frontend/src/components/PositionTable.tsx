import { formatCurrency, pnlClass } from "@/lib/format";
import type { Position } from "@/lib/types";

export function PositionTable({ positions }: { positions: Position[] }) {
  return (
    <div className="overflow-hidden rounded border border-white/10 bg-panel/90">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Avg Price</th>
              <th className="px-4 py-3 text-right">Market</th>
              <th className="px-4 py-3 text-right">Unrealized</th>
              <th className="px-4 py-3 text-right">Realized</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {positions.map((position) => (
              <tr key={position.id} className="text-slate-300">
                <td className="px-4 py-3 font-medium text-white">{position.symbol}</td>
                <td className="px-4 py-3 text-right">{position.quantity.toFixed(4)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(position.average_price)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(position.market_price)}</td>
                <td className={`px-4 py-3 text-right ${pnlClass(position.unrealized_pnl)}`}>{formatCurrency(position.unrealized_pnl)}</td>
                <td className={`px-4 py-3 text-right ${pnlClass(position.realized_pnl)}`}>{formatCurrency(position.realized_pnl)}</td>
              </tr>
            ))}
            {positions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No open positions.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

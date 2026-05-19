import { TradeTable } from "@/components/TradeTable";
import { apiGet } from "@/lib/api";
import type { Trade } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const trades = await apiGet<Trade[]>("/trades");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Trades</h1>
        <p className="mt-1 text-sm text-slate-500">Filled and rejected paper orders with fees, slippage, and broker source.</p>
      </div>
      <TradeTable trades={trades} />
    </div>
  );
}


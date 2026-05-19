import { PaperOrderForm } from "@/components/PaperOrderForm";
import { PositionTable } from "@/components/PositionTable";
import { TradeTable } from "@/components/TradeTable";
import { apiGet } from "@/lib/api";
import type { Position, Trade } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PaperTradingPage() {
  const [positions, trades] = await Promise.all([
    apiGet<Position[]>("/positions"),
    apiGet<Trade[]>("/trades?limit=10")
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Paper Trading</h1>
        <p className="mt-1 text-sm text-slate-500">Simulated order entry with audit logs and pre-trade risk controls.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <PaperOrderForm />
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Open Positions</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Paper account</span>
          </div>
          <PositionTable positions={positions} />
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest Orders</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Paper broker</span>
        </div>
        <TradeTable trades={trades} />
      </section>
    </div>
  );
}


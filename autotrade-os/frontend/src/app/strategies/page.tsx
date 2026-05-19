import { StrategyManager } from "@/components/StrategyManager";
import { apiGet } from "@/lib/api";
import type { Strategy } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StrategiesPage() {
  const strategies = await apiGet<Strategy[]>("/strategies");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Strategies</h1>
        <p className="mt-1 text-sm text-slate-500">Rule-based strategy definitions for simulation and paper trading.</p>
      </div>

      <StrategyManager initialStrategies={strategies} />
    </div>
  );
}

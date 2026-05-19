import { PositionTable } from "@/components/PositionTable";
import { apiGet } from "@/lib/api";
import type { Position } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const positions = await apiGet<Position[]>("/positions");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Positions</h1>
        <p className="mt-1 text-sm text-slate-500">Current simulated holdings, mark prices, and paper P/L.</p>
      </div>
      <PositionTable positions={positions} />
    </div>
  );
}


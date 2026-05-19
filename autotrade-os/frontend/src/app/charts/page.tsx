import { MarketCharts } from "@/components/MarketCharts";
import { apiGet } from "@/lib/api";
import type { MarketData } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChartsPage() {
  const initialData = await apiGet<MarketData>("/market-data/NVDA?start_date=2025-01-01&end_date=2026-05-04");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Charts</h1>
        <p className="mt-1 text-sm text-slate-500">Explore historical market data with multiple chart styles before building or testing a strategy.</p>
      </div>

      <MarketCharts initialData={initialData} />
    </div>
  );
}


"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Search } from "lucide-react";
import { getJson } from "@/lib/clientApi";
import { formatCurrency, formatPercent, pnlClass } from "@/lib/format";
import type { MarketCandle, MarketData } from "@/lib/types";

type ChartKind = "area" | "line" | "candles" | "volume" | "returns";

const chartKinds: { value: ChartKind; label: string }[] = [
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "candles", label: "Candles" },
  { value: "volume", label: "Volume" },
  { value: "returns", label: "Daily Returns" }
];

export function MarketCharts({ initialData }: { initialData: MarketData }) {
  const [marketData, setMarketData] = useState(initialData);
  const [chartKind, setChartKind] = useState<ChartKind>("candles");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const chartData = useMemo(
    () =>
      marketData.candles.map((candle) => ({
        ...candle,
        label: new Date(candle.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        return_pct: candle.daily_return * 100
      })),
    [marketData]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const symbol = String(form.get("symbol") || "SPY").trim().toUpperCase();
    const startDate = String(form.get("start_date"));
    const endDate = String(form.get("end_date"));

    try {
      const data = await getJson<MarketData>(`/market-data/${encodeURIComponent(symbol)}?start_date=${startDate}&end_date=${endDate}`);
      setMarketData(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load market data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Field name="symbol" label="Symbol" defaultValue={marketData.symbol} />
          <Field name="start_date" label="Start Date" type="date" defaultValue={marketData.start_date} />
          <Field name="end_date" label="End Date" type="date" defaultValue={marketData.end_date} />
          <button className="inline-flex h-10 items-center justify-center gap-2 self-end rounded bg-white px-4 text-sm font-semibold text-black transition hover:bg-accent">
            <Search size={16} />
            {loading ? "Loading" : "Load"}
          </button>
        </form>
        {message ? <div className="mt-3 text-sm text-loss">{message}</div> : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Last Close" value={formatCurrency(marketData.summary.last_close)} />
        <SummaryCard label="Period Return" value={formatPercent(marketData.summary.change_pct)} tone={marketData.summary.change_pct} />
        <SummaryCard label="High / Low" value={`${formatCurrency(marketData.summary.high)} / ${formatCurrency(marketData.summary.low)}`} />
        <SummaryCard label="Avg Volume" value={marketData.summary.average_volume.toLocaleString()} />
      </section>

      <section className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{marketData.symbol} Market Chart</h2>
            <p className="mt-1 text-xs text-slate-500">{marketData.source}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {chartKinds.map((kind) => (
              <button
                key={kind.value}
                type="button"
                onClick={() => setChartKind(kind.value)}
                className={chartKind === kind.value ? "rounded bg-white px-3 py-2 text-xs font-semibold text-black" : "rounded bg-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/15"}
              >
                {kind.label}
              </button>
            ))}
          </div>
        </div>

        {chartKind === "area" ? <PriceAreaChart data={chartData} /> : null}
        {chartKind === "line" ? <PriceLineChart data={chartData} /> : null}
        {chartKind === "candles" ? <CandlestickPanel candles={marketData.candles} /> : null}
        {chartKind === "volume" ? <VolumeChart data={chartData} /> : null}
        {chartKind === "returns" ? <ReturnChart data={chartData} /> : null}
      </section>
    </div>
  );
}

function PriceAreaChart({ data }: { data: (MarketCandle & { label: string })[] }) {
  return (
    <ChartFrame>
      <AreaChart data={data} margin={{ left: 6, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="marketArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#5ed4ff" stopOpacity={0.32} />
            <stop offset="95%" stopColor="#5ed4ff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} width={58} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "Close"]} />
        <Area type="monotone" dataKey="close" stroke="#5ed4ff" strokeWidth={2} fill="url(#marketArea)" />
      </AreaChart>
    </ChartFrame>
  );
}

function PriceLineChart({ data }: { data: (MarketCandle & { label: string })[] }) {
  return (
    <ChartFrame>
      <LineChart data={data} margin={{ left: 6, right: 8, top: 10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} width={58} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "Close"]} />
        <Line type="monotone" dataKey="close" stroke="#39d98a" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartFrame>
  );
}

function VolumeChart({ data }: { data: (MarketCandle & { label: string })[] }) {
  return (
    <ChartFrame>
      <BarChart data={data} margin={{ left: 6, right: 8, top: 10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`} width={58} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value).toLocaleString(), "Volume"]} />
        <Bar dataKey="volume" fill="#5ed4ff" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

function ReturnChart({ data }: { data: (MarketCandle & { label: string; return_pct: number })[] }) {
  return (
    <ChartFrame>
      <BarChart data={data} margin={{ left: 6, right: 8, top: 10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} width={58} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(2)}%`, "Daily Return"]} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.35)" />
        <Bar dataKey="return_pct" fill="#39d98a" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

function CandlestickPanel({ candles }: { candles: MarketCandle[] }) {
  const width = 980;
  const height = 360;
  const padding = 28;
  const visible = candles.slice(-120);
  const lows = visible.map((candle) => candle.low);
  const highs = visible.map((candle) => candle.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = Math.max(max - min, 1);
  const step = (width - padding * 2) / Math.max(visible.length - 1, 1);
  const candleWidth = Math.max(Math.min(step * 0.56, 9), 3);
  const y = (price: number) => padding + ((max - price) / span) * (height - padding * 2);

  return (
    <div className="overflow-hidden rounded border border-white/10 bg-black/45">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full">
        <rect x="0" y="0" width={width} height={height} fill="#090b0e" />
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const gridY = padding + ratio * (height - padding * 2);
          const price = max - ratio * span;
          return (
            <g key={ratio}>
              <line x1={padding} x2={width - padding} y1={gridY} y2={gridY} stroke="rgba(255,255,255,0.07)" />
              <text x={width - padding + 4} y={gridY + 4} fill="#94a3b8" fontSize="11">
                ${price.toFixed(0)}
              </text>
            </g>
          );
        })}
        {visible.map((candle, index) => {
          const x = padding + index * step;
          const positive = candle.close >= candle.open;
          const color = positive ? "#39d98a" : "#ff5c7a";
          const openY = y(candle.open);
          const closeY = y(candle.close);
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(closeY - openY), 1.6);
          return (
            <g key={`${candle.date}-${index}`}>
              <line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.4" />
              <rect x={x - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} fill={positive ? "rgba(57,217,138,0.78)" : "rgba(255,92,122,0.78)"} stroke={color} strokeWidth="1" />
            </g>
          );
        })}
      </svg>
      <div className="border-t border-white/10 px-3 py-2 text-xs text-slate-500">Showing the latest {visible.length} candles from the selected range.</div>
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={tone === undefined ? "mt-3 text-xl font-semibold text-white" : `mt-3 text-xl font-semibold ${pnlClass(tone)}`}>{value}</div>
    </div>
  );
}

function Field({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm outline-none focus:border-accent" required />
    </label>
  );
}

const tooltipStyle = {
  background: "#0b0d10",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 4,
  color: "#e2e8f0"
};


"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

export function EquityChart({ data }: { data: { date: string; value: number }[] }) {
  const normalized = data.map((point) => ({
    ...point,
    label: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }));

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={normalized} margin={{ left: 6, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#39d98a" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#39d98a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
            width={58}
          />
          <Tooltip
            contentStyle={{ background: "#0b0d10", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4 }}
            formatter={(value) => [formatCurrency(Number(value)), "Equity"]}
            labelStyle={{ color: "#cbd5e1" }}
          />
          <Area type="monotone" dataKey="value" stroke="#39d98a" strokeWidth={2} fill="url(#equity)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


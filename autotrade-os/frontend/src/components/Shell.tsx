"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  BarChart3,
  BookOpen,
  CandlestickChart,
  ChartLine,
  FileClock,
  Gauge,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldAlert,
  WalletCards
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/charts", label: "Charts", icon: ChartLine },
  { href: "/strategies", label: "Strategies", icon: ListChecks },
  { href: "/backtest", label: "Backtest", icon: BarChart3 },
  { href: "/paper-trading", label: "Paper Trading", icon: Activity },
  { href: "/positions", label: "Positions", icon: WalletCards },
  { href: "/trades", label: "Trades", icon: CandlestickChart },
  { href: "/risk", label: "Risk", icon: ShieldAlert },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/logs", label: "Logs", icon: FileClock }
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#08090b] text-slate-100 autotrade-grid">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-black/80 px-4 py-5 backdrop-blur lg:block">
        <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded bg-accent/15 text-accent">
            <Landmark size={22} />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-wide">AutoTrade OS</span>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Paper First</span>
          </span>
        </Link>

        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex h-11 items-center gap-3 rounded px-3 text-sm transition",
                  active ? "bg-white text-black" : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 rounded border border-caution/30 bg-caution/10 p-3 text-xs leading-5 text-caution">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <Gauge size={15} />
            Simulation Mode
          </div>
          Live execution is disabled by default.
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[#08090b]/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-accent" />
            <span className="font-semibold">AutoTrade OS</span>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "whitespace-nowrap rounded px-3 py-2 text-xs",
                  pathname === item.href ? "bg-white text-black" : "bg-white/10 text-slate-300"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 rounded border border-caution/25 bg-caution/10 px-4 py-3 text-sm text-caution">
            This app is for education and paper trading only. Trading involves risk.
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

import Link from "next/link";
import { CalendarDays, LogOut, MapPin, Settings, Utensils } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Reservations", icon: CalendarDays },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-neutral-200 bg-white px-5 py-6 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-neutral-200 bg-neutral-950 text-white">
            <Utensils size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-500">
              ReserveOS
            </p>
            <p className="text-lg font-black tracking-tight">AI Reservations</p>
          </div>
        </Link>

        <nav className="mt-10 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded px-3 py-3 text-sm font-black text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/api/auth/logout" method="post" className="absolute bottom-6 left-5 right-5">
          <button className="flex w-full items-center justify-center gap-2 rounded border border-neutral-200 px-4 py-3 text-sm font-black text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950">
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </aside>

      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <header className="mb-8 flex items-center justify-between border-b border-neutral-200 pb-5 lg:hidden">
            <Link href="/dashboard" className="text-xl font-black tracking-tight">
              ReserveOS
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="rounded bg-neutral-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                Sign out
              </button>
            </form>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

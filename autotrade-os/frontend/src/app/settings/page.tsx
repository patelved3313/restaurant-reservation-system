import { apiGet } from "@/lib/api";

export const dynamic = "force-dynamic";

type AppSettings = {
  app_name: string;
  enable_live_trading: boolean;
  paper_starting_cash: number;
  live_trading_status: string;
  interactive_brokers_adapter: string;
  warning: string;
};

export default async function SettingsPage() {
  const settings = await apiGet<AppSettings>("/settings");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Environment-backed runtime configuration and broker readiness.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Application</div>
          <div className="mt-3 text-xl font-semibold">{settings.app_name}</div>
          <div className="mt-2 text-sm text-slate-500">Starting paper cash: ${settings.paper_starting_cash.toLocaleString()}</div>
        </div>
        <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Live Trading</div>
          <div className={settings.enable_live_trading ? "mt-3 text-xl font-semibold text-loss" : "mt-3 text-xl font-semibold text-profit"}>
            {settings.live_trading_status}
          </div>
          <div className="mt-2 text-sm text-slate-500">Interactive Brokers: {settings.interactive_brokers_adapter.replaceAll("_", " ")}</div>
        </div>
      </section>

      <section className="rounded border border-caution/25 bg-caution/10 p-4 text-caution">
        <div className="text-sm font-semibold">ENABLE_LIVE_TRADING=false by default</div>
        <div className="mt-2 text-sm leading-6">{settings.warning}</div>
      </section>
    </div>
  );
}


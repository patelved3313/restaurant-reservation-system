import clsx from "clsx";

export function StatCard({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "profit" | "loss" | "accent";
}) {
  return (
    <div className="rounded border border-white/10 bg-panel/90 p-4 shadow-glow">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div
        className={clsx("mt-3 text-2xl font-semibold", {
          "text-profit": tone === "profit",
          "text-loss": tone === "loss",
          "text-accent": tone === "accent",
          "text-white": tone === "neutral"
        })}
      >
        {value}
      </div>
      {detail ? <div className="mt-2 text-sm text-slate-500">{detail}</div> : null}
    </div>
  );
}


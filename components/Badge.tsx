import { clsx } from "clsx";

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "dark";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded border px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em]",
        tone === "dark"
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-neutral-200 bg-neutral-50 text-neutral-700",
      )}
    >
      {children}
    </span>
  );
}

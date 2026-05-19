export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-panel">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </p>
      <p className="mt-4 text-4xl font-black tracking-tight text-neutral-950">{value}</p>
      <p className="mt-2 text-sm font-bold text-neutral-500">{detail}</p>
    </div>
  );
}

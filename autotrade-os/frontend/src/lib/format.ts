export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function formatPercent(value: number) {
  return `${((value || 0) * 100).toFixed(2)}%`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function pnlClass(value: number) {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-slate-300";
}


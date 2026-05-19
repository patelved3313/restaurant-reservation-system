import { apiGet } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { SystemLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const logs = await apiGet<SystemLog[]>("/logs");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Logs</h1>
        <p className="mt-1 text-sm text-slate-500">System events, order audit records, risk changes, and paper session activity.</p>
      </div>

      <section className="overflow-hidden rounded border border-white/10 bg-panel/90 shadow-glow">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Level</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(log.created_at)}</td>
                  <td className={log.level === "critical" || log.level === "warning" ? "px-4 py-3 text-loss" : "px-4 py-3 text-profit"}>{log.level}</td>
                  <td className="px-4 py-3 font-medium text-white">{log.event_type}</td>
                  <td className="px-4 py-3">{log.message}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No logs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

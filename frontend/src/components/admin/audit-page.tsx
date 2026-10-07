"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { Notice, PageHeader, Panel, TableEmpty, btn, dateTime, inputCls, rowHover, selectCls, table, td, th } from "./ui";
import { useAdminApi } from "./use-admin-api";

type Entry = { id: string; at: string; actorEmail: string | null; action: string; target: string | null; detail: string | null };

export function AuditPage() {
  const api = useAdminApi();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (action) params.set("action", action);
        if (q.trim()) params.set("q", q.trim());
        if (before) params.set("before", before);
        const d = await api<{ entries: Entry[]; next: string | null }>(`/api/superadmin/audit?${params}`);
        setEntries((cur) => (before ? [...cur, ...d.entries] : d.entries));
        setNext(d.next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the audit log");
      }
      setLoading(false);
    },
    [api, action, q]
  );

  useEffect(() => {
    const t = setTimeout(() => load(), q ? 300 : 0); // wait for typing to pause
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Who changed what: staff and roles, products, stock, production and quotes."
        actions={
          <>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Who (email)" aria-label="Filter by person" className={`${inputCls} w-44 pl-8`} />
            </div>
            <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action" className={selectCls}>
              <option value="">All actions</option>
              {Object.entries(AUDIT_ACTIONS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => load()} disabled={loading} className={btn.secondary}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </>
        }
      />

      {error && <Notice tone="danger">{error}</Notice>}

      <Panel flush>
        <div className="overflow-x-auto">
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>When</th>
                <th className={th}>Who</th>
                <th className={th}>What</th>
                <th className={th}>On</th>
                <th className={th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {!entries.length && (
                <TableEmpty cols={5} loading={loading}>
                  Nothing recorded yet.
                </TableEmpty>
              )}
              {entries.map((e) => (
                <tr key={e.id} className={rowHover}>
                  <td className={`${td} whitespace-nowrap text-slate-500`}>{dateTime(e.at)}</td>
                  <td className={`${td} max-w-[220px] truncate`}>{e.actorEmail ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap font-medium text-slate-900`}>{AUDIT_ACTIONS[e.action] ?? e.action}</td>
                  <td className={`${td} max-w-[220px] truncate`}>{e.target ?? "—"}</td>
                  <td className={`${td} max-w-[260px] truncate text-slate-500`}>{e.detail ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {next && (
        <div className="text-center">
          <button type="button" onClick={() => load(next)} disabled={loading} className={btn.secondary}>
            Load older
          </button>
        </div>
      )}
    </div>
  );
}

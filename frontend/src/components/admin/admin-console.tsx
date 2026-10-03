"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Quote = { _id: string; name: string; company?: string; email: string; phone?: string; product?: string; quantity?: number; message?: string; status: string; notes?: string; createdAt: string };
type DesignRow = { id: string; product: string; color: string; preview?: string; status: string; statusNote?: string; medusaOrderId?: string; summary: string; createdAt: string };

const QUOTE_STATUSES = ["new", "contacted", "won", "lost"];
const DESIGN_STATUSES = [
  ["ordered", "Ordered"],
  ["approved", "Design approved"],
  ["in_production", "In production"],
  ["shipped", "Shipped"],
];
const KEY = "cottson-admin-key";
const field = "h-9 rounded-md border border-slate-300 bg-white px-2 text-sm";

// Minimal staff console: quotes and the production queue. Everything is guarded server-side by ADMIN_API_KEY.
export function AdminConsole() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"quotes" | "production">("production");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [designs, setDesigns] = useState<DesignRow[]>([]);

  const call = useCallback(
    async (path: string, init?: RequestInit, k = key) => {
      const res = await fetch(path, { ...init, headers: { "content-type": "application/json", "x-admin-key": k, ...init?.headers } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data;
    },
    [key]
  );

  const load = useCallback(
    async (k = key) => {
      const [q, d] = await Promise.all([call("/api/admin/quotes", undefined, k), call("/api/admin/designs", undefined, k)]);
      setQuotes(q.quotes);
      setDesigns(d.designs);
    },
    [call, key]
  );

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        // Restoring the saved key on mount syncs with an external system (sessionStorage)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load(saved)
          .then(() => {
            setKey(saved);
            setAuthed(true);
          })
          .catch(() => sessionStorage.removeItem(KEY));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    try {
      await load(key);
      try { sessionStorage.setItem(KEY, key); } catch {}
      setAuthed(true);
    } catch {
      toast.error("Wrong admin key");
    }
  }

  async function patch(path: string, body: unknown, apply: () => void) {
    try {
      await call(path, { method: "PATCH", body: JSON.stringify(body) });
      apply();
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  if (!authed)
    return (
      <form onSubmit={signIn} className="mx-auto max-w-sm px-4 pt-40">
        <h1 className="text-xl font-semibold">Staff console</h1>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin key" className={`${field} mt-4 w-full`} autoFocus />
        <button className="mt-3 h-9 w-full rounded-md bg-[#113858] text-sm font-semibold text-white">Open</button>
      </form>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-32">
      <div className="flex items-center gap-2">
        {(["production", "quotes"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-9 rounded-full px-4 text-sm font-semibold ${tab === t ? "bg-[#113858] text-white" : "bg-slate-100"}`}>
            {t === "production" ? `Production (${designs.length})` : `Quotes (${quotes.length})`}
          </button>
        ))}
        <button onClick={() => load().catch(() => toast.error("Refresh failed"))} className="ml-auto text-sm underline">Refresh</button>
      </div>

      {tab === "production" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {designs.length === 0 && <p className="text-sm text-slate-500">No ordered designs yet.</p>}
          {designs.map((d) => (
            <div key={d.id} className="flex gap-4 rounded-xl border p-4">
              {d.preview && <img src={d.preview} alt="" className="size-24 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{d.product} · {d.color}</p>
                <p className="truncate text-slate-500">Order {d.medusaOrderId ?? "—"}</p>
                <p className="mt-1 text-slate-600">{d.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    className={field}
                    value={d.status}
                    onChange={(e) => patch(`/api/admin/designs/${d.id}`, { status: e.target.value }, () => setDesigns((all) => all.map((x) => (x.id === d.id ? { ...x, status: e.target.value } : x))))}
                  >
                    {DESIGN_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button
                    className="text-sm underline"
                    onClick={async () => {
                      try {
                        const full = await call(`/api/designs/${d.id}`);
                        const url = URL.createObjectURL(new Blob([JSON.stringify(full, null, 2)], { type: "application/json" }));
                        Object.assign(document.createElement("a"), { href: url, download: `design-${d.id}.json` }).click();
                        URL.revokeObjectURL(url);
                      } catch {
                        toast.error("Could not download the design");
                      }
                    }}
                  >
                    Download design
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "quotes" && (
        <div className="mt-6 space-y-3">
          {quotes.length === 0 && <p className="text-sm text-slate-500">No quote requests yet.</p>}
          {quotes.map((q) => (
            <div key={q._id} className="rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{q.name}{q.company && ` · ${q.company}`}</p>
                <select
                  className={field}
                  value={q.status}
                  onChange={(e) => patch(`/api/admin/quotes/${q._id}`, { status: e.target.value }, () => setQuotes((all) => all.map((x) => (x._id === q._id ? { ...x, status: e.target.value } : x))))}
                >
                  {QUOTE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-slate-600">
                <a className="underline" href={`mailto:${q.email}`}>{q.email}</a>{q.phone && ` · ${q.phone}`}
                {q.product && ` · ${q.product}`}{q.quantity && ` · ${q.quantity} pcs`} · {new Date(q.createdAt).toLocaleDateString("en-IN")}
              </p>
              {q.message && <p className="mt-2 whitespace-pre-wrap">{q.message}</p>}
              <textarea
                defaultValue={q.notes ?? ""}
                placeholder="Internal notes (saved on blur)"
                rows={2}
                className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
                onBlur={(e) => e.target.value !== (q.notes ?? "") && patch(`/api/admin/quotes/${q._id}`, { notes: e.target.value }, () => setQuotes((all) => all.map((x) => (x._id === q._id ? { ...x, notes: e.target.value } : x))))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { DefinitionList, Drawer, Notice, PageHeader, Segmented, Status, TableEmpty, btn, dateTime, rowHover, selectCls, shortDate, table, td, th } from "./ui";
import { QUOTE_STATUSES, quoteTone, type Quote } from "./types";
import { useAdminData } from "./use-admin-api";

type Filter = "all" | (typeof QUOTE_STATUSES)[number];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function QuotesPage() {
  const { data, error, loading, reload, api, setData } = useAdminData<{ quotes: Quote[] }>("/api/admin/quotes");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const quotes = useMemo(() => data?.quotes ?? [], [data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: quotes.length };
    for (const q of quotes) c[q.status] = (c[q.status] ?? 0) + 1;
    return c;
  }, [quotes]);
  const shown = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);
  const open = quotes.find((q) => q._id === openId) ?? null;

  const edit = (id: string, patch: Partial<Quote>) => setData((d) => d && { quotes: d.quotes.map((q) => (q._id === id ? { ...q, ...patch } : q)) });

  async function save(id: string, patch: { status?: string; notes?: string }) {
    try {
      await api(`/api/admin/quotes/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      edit(id, patch);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  const show = (q: Quote | null) => {
    setOpenId(q?._id ?? null);
    setNotes(q?.notes ?? "");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quotes"
        description="Bulk-order enquiries from the website."
        actions={
          <button type="button" onClick={reload} disabled={loading} className={btn.secondary}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {error && <Notice tone="danger">{error}</Notice>}

      <Segmented label="Filter quotes by status" value={filter} onChange={setFilter} options={[{ id: "all", label: "All", count: counts.all }, ...QUOTE_STATUSES.map((s) => ({ id: s as Filter, label: cap(s), count: counts[s] ?? 0 }))]} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Received</th>
              <th className={th}>Contact</th>
              <th className={th}>Product</th>
              <th className={`${th} text-right`}>Qty</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <TableEmpty cols={5} loading={loading}>{quotes.length ? "No quotes with this status." : "No quote requests yet."}</TableEmpty>}
            {shown.map((q) => (
              <tr key={q._id} onClick={() => show(q)} className={cn(rowHover, "cursor-pointer", q._id === openId && "bg-slate-50")}>
                <td className={`${td} whitespace-nowrap text-slate-500`}>{shortDate(q.createdAt)}</td>
                <td className={td}>
                  <p className="font-medium text-slate-900">{q.name}</p>
                  <p className="text-[12px] text-slate-500">{q.company || q.email}</p>
                </td>
                <td className={td}>{q.product ? (getProduct(q.product)?.title ?? q.product) : <span className="text-slate-400">—</span>}</td>
                <td className={`${td} text-right tabular-nums`}>{q.quantity ?? <span className="text-slate-400">—</span>}</td>
                <td className={td}><Status tone={quoteTone[q.status] ?? "neutral"}>{cap(q.status)}</Status></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!open} onClose={() => show(null)} title={open?.name ?? ""} subtitle={open ? `${open.company ? `${open.company} · ` : ""}Received ${dateTime(open.createdAt)}` : undefined}>
        {open && (
          <div className="space-y-6">
            <DefinitionList
              items={[
                ["Email", <a key="e" href={`mailto:${open.email}`} className="text-[#113858] hover:underline">{open.email}</a>],
                ["Phone", open.phone || "—"],
                ["Product", open.product ? (getProduct(open.product)?.title ?? open.product) : "—"],
                ["Quantity", open.quantity ? `${open.quantity} pieces` : "—"],
              ]}
            />

            <section>
              <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">Message</h3>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{open.message || <span className="text-slate-400">No message.</span>}</p>
            </section>

            <section>
              <label htmlFor="quote-status" className="mb-2 block text-[12px] font-medium uppercase tracking-wide text-slate-500">Status</label>
              <select id="quote-status" value={open.status} onChange={(e) => save(open._id, { status: e.target.value })} className={cn(selectCls, "w-44")}>
                {QUOTE_STATUSES.map((s) => (
                  <option key={s} value={s}>{cap(s)}</option>
                ))}
              </select>
            </section>

            <section>
              <label htmlFor="quote-notes" className="mb-2 block text-[12px] font-medium uppercase tracking-wide text-slate-500">Internal notes</label>
              <textarea id="quote-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Only visible to admins" className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#113858] focus:ring-2 focus:ring-[#113858]/15" />
              <div className="mt-2 flex justify-end">
                <button type="button" disabled={notes === (open.notes ?? "")} onClick={() => save(open._id, { notes })} className={btn.primary}>
                  Save notes
                </button>
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}

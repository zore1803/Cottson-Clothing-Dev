"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { Drawer, Notice, PageHeader, Panel, Status, TableEmpty, btn, dateTime, inputCls, money, rowHover, shortDate, table, td, th } from "./ui";
import { designLabel, designTone, orderState, type AdminOrder } from "./types";
import { useAdminApi } from "./use-admin-api";

type Customer = { id: string; email: string; first_name: string | null; last_name: string | null; phone: string | null; company_name: string | null; created_at: string; has_account: boolean };
type Detail = {
  customer: Customer & { addresses?: { address_1?: string | null; city?: string | null; postal_code?: string | null }[] };
  orders: AdminOrder[];
  designs: { id: string; product: string; color: string; preview?: string; status: string; summary: string; createdAt: string }[];
  spent: number;
  orderCount: number;
};

const nameOf = (c: Customer) => [c.first_name, c.last_name].filter(Boolean).join(" ");

export function CustomersPage() {
  const api = useAdminApi();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Customer[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(
    async (offset = 0) => {
      setLoading(true);
      setError("");
      try {
        const d = await api<{ customers: Customer[]; count: number }>(`/api/admin/customers?offset=${offset}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`);
        setRows((cur) => (offset ? [...cur, ...d.customers] : d.customers));
        setCount(d.count);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load customers");
      }
      setLoading(false);
    },
    [api, q]
  );

  useEffect(() => {
    const t = setTimeout(() => load(), q ? 300 : 0); // wait for typing to pause
    return () => clearTimeout(t);
  }, [load, q]);

  async function show(c: Customer) {
    setOpen(c);
    setDetail(null);
    setDetailError("");
    try {
      setDetail(await api<Detail>(`/api/admin/customers/${c.id}`));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Could not load this customer");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Search customers and see what they have ordered and designed."
        actions={
          <>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone or company" aria-label="Search customers" className={`${inputCls} w-64 pl-8`} />
            </div>
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
                <th className={th}>Customer</th>
                <th className={th}>Company</th>
                <th className={th}>Phone</th>
                <th className={th}>Account</th>
                <th className={th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <TableEmpty cols={5} loading={loading}>
                  {q ? "No customers match that search." : "No customers yet."}
                </TableEmpty>
              )}
              {rows.map((c) => (
                <tr key={c.id} className={`${rowHover} cursor-pointer`} onClick={() => show(c)}>
                  <td className={td}>
                    <button type="button" className="text-left" onClick={() => show(c)}>
                      <div className="font-medium text-slate-900">{nameOf(c) || c.email}</div>
                      {nameOf(c) && <div className="text-[12.5px] text-slate-500">{c.email}</div>}
                    </button>
                  </td>
                  <td className={td}>{c.company_name ?? "—"}</td>
                  <td className={td}>{c.phone ?? "—"}</td>
                  <td className={td}>
                    <Status tone={c.has_account ? "success" : "neutral"}>{c.has_account ? "Registered" : "Guest"}</Status>
                  </td>
                  <td className={`${td} whitespace-nowrap text-slate-500`}>{shortDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {rows.length < count && (
        <div className="text-center">
          <button type="button" onClick={() => load(rows.length)} disabled={loading} className={btn.secondary}>
            Show more ({count - rows.length} left)
          </button>
        </div>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? nameOf(open) || open.email : ""} subtitle={open && nameOf(open) ? open.email : undefined}>
        {detailError && <Notice tone="danger">{detailError}</Notice>}
        {!detail && !detailError && <p className="text-[13px] text-slate-500">Loading…</p>}
        {detail && (
          <div className="space-y-6 text-[13px]">
            <dl className="grid grid-cols-3 gap-3">
              {[
                ["Orders", String(detail.orderCount)],
                ["Spent", money(detail.spent)],
                ["Joined", shortDate(detail.customer.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-slate-200 px-3 py-2">
                  <dt className="text-[12px] text-slate-500">{k}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>

            <section>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Orders</h3>
              {!detail.orders.length && <p className="text-slate-500">No orders yet.</p>}
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {detail.orders.map((o) => {
                  const st = orderState(o);
                  return (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <Link href={`/admin/orders?order=${o.id}`} className="font-medium text-slate-900 hover:underline">
                          #{o.display_id}
                        </Link>
                        <span className="ml-2 text-slate-500">{dateTime(o.created_at)}</span>
                        <p className="truncate text-[12px] text-slate-500">{o.items.map((i) => `${i.quantity} × ${i.title}`).join(", ")}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="tabular-nums text-slate-900">{money(o.total)}</div>
                        <Status tone={st.tone}>{st.label}</Status>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Saved designs</h3>
              {!detail.designs.length && <p className="text-slate-500">No saved designs.</p>}
              <ul className="space-y-2">
                {detail.designs.map((d) => (
                  <li key={d.id} className="flex gap-3 rounded-md border border-slate-200 p-2.5">
                    {d.preview ? <img src={d.preview} alt="" className="size-12 shrink-0 rounded border border-slate-200 object-cover" /> : <span className="size-12 shrink-0 rounded border border-dashed border-slate-300" />}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {d.product} · {d.color}
                      </p>
                      <p className="truncate text-[12px] text-slate-500">{d.summary}</p>
                      <Status tone={designTone[d.status] ?? "neutral"}>{designLabel(d.status)}</Status>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}

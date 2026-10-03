"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Notice, PageHeader, Panel, Status, money, shortDate, table, td, th, TableEmpty, rowHover } from "./ui";
import { orderState, type AdminOrder } from "./types";
import { useAdminData } from "./use-admin-api";

type Summary = { toApprove: number; newQuotes: number };

export function OverviewPage() {
  const orders = useAdminData<{ orders: AdminOrder[] }>("/api/admin/orders");
  const summary = useAdminData<Summary>("/api/admin/summary");

  const all = orders.data?.orders ?? [];
  const live = all.filter((o) => o.status !== "canceled");
  const revenue = live.reduce((n, o) => n + o.total, 0);
  const processing = live.filter((o) => orderState(o).label === "Processing").length;
  const s = summary.data ?? { toApprove: 0, newQuotes: 0 };

  const kpis: { label: string; value: string; note: string }[] = [
    { label: "Orders", value: String(live.length), note: all.length > live.length ? `${all.length - live.length} cancelled` : "None cancelled" },
    { label: "Revenue", value: money(revenue), note: "Excluding cancelled" },
    { label: "Awaiting design approval", value: String(s.toApprove), note: "In the production queue" },
    { label: "Unanswered quotes", value: String(s.newQuotes), note: "Status: new" },
  ];

  const todo = [
    { href: "/admin/production", label: "Designs to approve", n: s.toApprove },
    { href: "/admin/quotes", label: "Quotes to answer", n: s.newQuotes },
    { href: "/admin/orders", label: "Orders in processing", n: processing },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Orders, production and enquiries at a glance." />

      {orders.error && <Notice tone="danger">Orders could not be loaded: {orders.error}</Notice>}

      <div className="grid divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-4 py-3.5 ${i >= 2 ? "border-t border-slate-200 lg:border-t-0" : ""} ${i === 1 ? "border-t border-slate-200 sm:border-t-0" : ""}`}>
            <p className="text-[12px] text-slate-500">{k.label}</p>
            <p className="mt-1 text-[22px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">{orders.loading && k.label.startsWith("Orders") ? "…" : k.value}</p>
            <p className="mt-1.5 text-[12px] text-slate-400">{k.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel
          title="Recent orders"
          flush
          action={
            <Link href="/admin/orders" className="text-[13px] font-medium text-[#113858] hover:underline">
              All orders
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Date</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {all.length === 0 && <TableEmpty cols={5} loading={orders.loading}>No orders yet.</TableEmpty>}
                {all.slice(0, 6).map((o) => {
                  const st = orderState(o);
                  return (
                    <tr key={o.id} className={rowHover}>
                      <td className={`${td} font-medium text-slate-900`}>
                        <Link href={`/admin/orders?order=${o.id}`} className="hover:underline">#{o.display_id}</Link>
                      </td>
                      <td className={`${td} max-w-[220px] truncate`}>{o.email}</td>
                      <td className={`${td} whitespace-nowrap text-slate-500`}>{shortDate(o.created_at)}</td>
                      <td className={td}><Status tone={st.tone}>{st.label}</Status></td>
                      <td className={`${td} text-right tabular-nums text-slate-900`}>{money(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Needs attention" flush>
          <ul className="divide-y divide-slate-100">
            {todo.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-slate-700 transition hover:bg-slate-50">
                  <span>{t.label}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`tabular-nums ${t.n > 0 ? "font-semibold text-slate-900" : "text-slate-400"}`}>{t.n}</span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {summary.error && <p className="text-[12px] text-slate-400">Counts unavailable: {summary.error}</p>}
    </div>
  );
}

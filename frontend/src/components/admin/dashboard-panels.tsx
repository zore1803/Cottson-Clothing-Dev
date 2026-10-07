"use client";

import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Panel, money } from "./ui";
import { useAdminData } from "./use-admin-api";

type Stats = {
  current: { revenue: number; orders: number; average: number };
  previous: { revenue: number; orders: number; average: number };
  days: { date: string; revenue: number; orders: number }[];
  topProducts: { title: string; units: number; revenue: number }[];
  quotes: { total: number; new: number; contacted: number; won: number; lost: number; winRate: number | null; conversion: number | null };
};
type LowStock = { threshold: number; total: number; out: number; items: { productId: string; product: string; color: string; size: string; available: number }[] };

/** Change against the previous 30 days, as a small arrow and percentage */
function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-slate-400">{now ? "New" : "—"}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 ${up ? "text-emerald-700" : "text-red-700"}`}>
      <Icon size={13} /> {Math.abs(pct)}%
    </span>
  );
}

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function DashboardPanels() {
  const stats = useAdminData<Stats>("/api/admin/stats");
  const low = useAdminData<LowStock>("/api/admin/low-stock");
  const s = stats.data;
  const peak = Math.max(1, ...(s?.days.map((d) => d.revenue) ?? [1]));

  const figures = s
    ? [
        { label: "Revenue", value: money(s.current.revenue), now: s.current.revenue, before: s.previous.revenue },
        { label: "Orders", value: String(s.current.orders), now: s.current.orders, before: s.previous.orders },
        { label: "Average order", value: money(s.current.average), now: s.current.average, before: s.previous.average },
      ]
    : [];

  return (
    <>
      {low.data && low.data.total > 0 && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <span className="flex items-center gap-2">
            <AlertTriangle size={15} />
            {low.data.out > 0 ? `${low.data.out} item${low.data.out === 1 ? " is" : "s are"} out of stock` : `${low.data.total} item${low.data.total === 1 ? " is" : "s are"} running low`}
            {low.data.out > 0 && low.data.total > low.data.out ? `, ${low.data.total - low.data.out} more running low` : ""}
          </span>
          <Link href="/admin/products" className="font-medium underline">
            Manage stock
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="Last 30 days" action={<span className="text-[12px] text-slate-400">vs the 30 days before</span>}>
          {stats.error && <p className="text-[13px] text-red-700">Could not load sales figures: {stats.error}</p>}
          <dl className="grid grid-cols-3 gap-4">
            {figures.map((f) => (
              <div key={f.label}>
                <dt className="text-[12px] text-slate-500">{f.label}</dt>
                <dd className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-slate-900">{f.value}</dd>
                <dd className="mt-1.5 text-[12px]">
                  <Delta now={f.now} before={f.before} />
                </dd>
              </div>
            ))}
            {stats.loading && <dd className="col-span-3 text-[13px] text-slate-400">Loading…</dd>}
          </dl>
          {s && (
            <>
              <div className="mt-5 flex h-28 items-end gap-[3px]" role="img" aria-label="Revenue per day for the last 30 days">
                {s.days.map((d) => (
                  <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${dayLabel(d.date)}: ${money(d.revenue)}, ${d.orders} order${d.orders === 1 ? "" : "s"}`}>
                    <div className={`w-full rounded-t-sm ${d.revenue ? "bg-[#113858]" : "bg-slate-200"}`} style={{ height: `${d.revenue ? Math.max(4, (d.revenue / peak) * 100) : 2}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                <span>{dayLabel(s.days[0].date)}</span>
                <span>Today</span>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Quotes" flush>
          {s && (
            <div className="space-y-3 p-4 text-[13px]">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Won of all quotes</span>
                <span className="text-[20px] font-semibold tabular-nums text-slate-900">{s.quotes.conversion === null ? "—" : `${s.quotes.conversion}%`}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Won of closed quotes</span>
                <span className="font-semibold tabular-nums text-slate-900">{s.quotes.winRate === null ? "—" : `${s.quotes.winRate}%`}</span>
              </div>
              <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                {(["new", "contacted", "won", "lost"] as const).map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="w-20 capitalize text-slate-500">{k}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-[#113858]" style={{ width: `${s.quotes.total ? (s.quotes[k] / s.quotes.total) * 100 : 0}%` }} />
                    </span>
                    <span className="w-6 text-right tabular-nums text-slate-700">{s.quotes[k]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top products" action={<span className="text-[12px] text-slate-400">last 30 days, by revenue</span>} flush>
          {s && !s.topProducts.length && <p className="px-4 py-6 text-center text-[13px] text-slate-500">No orders in this period.</p>}
          <ul className="divide-y divide-slate-100">
            {s?.topProducts.map((p, i) => (
              <li key={p.title} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="w-4 text-slate-400 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{p.title}</span>
                <span className="text-slate-500 tabular-nums">{p.units} pcs</span>
                <span className="w-24 text-right tabular-nums text-slate-900">{money(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Low stock" action={low.data ? <span className="text-[12px] text-slate-400">at or below {low.data.threshold} available</span> : undefined} flush>
          {low.data && !low.data.total && <p className="px-4 py-6 text-center text-[13px] text-slate-500">Nothing is running low. Made-to-order items are never listed.</p>}
          {low.error && <p className="px-4 py-3 text-[13px] text-red-700">Could not check stock: {low.error}</p>}
          <ul className="divide-y divide-slate-100">
            {low.data?.items.slice(0, 8).map((i) => (
              <li key={`${i.productId}-${i.color}-${i.size}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <span className="min-w-0 truncate text-slate-900">
                  {i.product} <span className="text-slate-500">· {i.color} · {i.size}</span>
                </span>
                <span className={`shrink-0 tabular-nums ${i.available <= 0 ? "font-semibold text-red-700" : "text-amber-700"}`}>{i.available <= 0 ? "Out" : `${i.available} left`}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

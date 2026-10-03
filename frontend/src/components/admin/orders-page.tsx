"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DefinitionList, Drawer, Notice, PageHeader, Segmented, Status, TableEmpty, btn, dateTime, inputCls, money, rowHover, selectCls, shortDate, table, td, th } from "./ui";
import { DESIGN_STEPS, MEDUSA_URL, designLabel, designTone, orderState, type AdminOrder } from "./types";
import { useAdminData } from "./use-admin-api";

type Filter = "all" | "Processing" | "Shipped" | "Completed" | "Cancelled";
const FILTERS: Filter[] = ["all", "Processing", "Shipped", "Completed", "Cancelled"];

const payLabel = (o: AdminOrder) =>
  o.razorpay ? `${o.razorpay.status === "paid" ? "Paid" : o.razorpay.status}${o.razorpay.method ? ` · ${o.razorpay.method.toUpperCase()}` : ""}` : (o.payment_status?.replace(/_/g, " ") ?? "—");

export function OrdersPage() {
  const router = useRouter();
  const openId = useSearchParams().get("order");
  const { data, error, loading, reload, api, setData } = useAdminData<{ orders: AdminOrder[] }>("/api/admin/orders");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[orderState(o).label] = (c[orderState(o).label] ?? 0) + 1;
    return c;
  }, [orders]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((o) => (filter === "all" || orderState(o).label === filter) && (!q || String(o.display_id) === q || (o.email ?? "").toLowerCase().includes(q)));
  }, [orders, query, filter]);

  const open = orders.find((o) => o.id === openId) ?? null;
  const select = (id: string | null) => router.replace(id ? `/admin/orders?order=${id}` : "/admin/orders", { scroll: false });

  async function setDesignStatus(designId: string, status: string) {
    try {
      await api(`/api/admin/designs/${designId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setData((d) => d && { orders: d.orders.map((o) => ({ ...o, items: o.items.map((i) => (i.design?.id === designId ? { ...i, design: { ...i.design, status } } : i)) })) });
      toast.success("Design status updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description={loading && !orders.length ? "Loading…" : `${orders.length} order${orders.length === 1 ? "" : "s"}, newest first`}
        actions={
          <button type="button" onClick={reload} disabled={loading} className={btn.secondary}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filter orders by status"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ id: f, label: f === "all" ? "All" : f, count: counts[f] ?? 0 }))}
        />
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order number or email" aria-label="Search orders" className={cn(inputCls, "w-60 pl-8")} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Placed</th>
              <th className={th}>Customer</th>
              <th className={`${th} text-right`}>Pieces</th>
              <th className={th}>Payment</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <TableEmpty cols={7} loading={loading}>{orders.length ? "No orders match." : "No orders yet."}</TableEmpty>}
            {shown.map((o) => {
              const st = orderState(o);
              return (
                <tr key={o.id} onClick={() => select(o.id)} className={cn(rowHover, "cursor-pointer", o.id === openId && "bg-slate-50")}>
                  <td className={`${td} font-medium text-slate-900`}>#{o.display_id}</td>
                  <td className={`${td} whitespace-nowrap text-slate-500`}>{shortDate(o.created_at)}</td>
                  <td className={`${td} max-w-[240px] truncate`}>{o.email}</td>
                  <td className={`${td} text-right tabular-nums`}>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className={`${td} whitespace-nowrap text-slate-600`}>{payLabel(o)}</td>
                  <td className={td}><Status tone={st.tone}>{st.label}</Status></td>
                  <td className={`${td} text-right tabular-nums text-slate-900`}>{money(o.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer open={!!open} onClose={() => select(null)} title={open ? `Order #${open.display_id}` : ""} subtitle={open ? `Placed ${dateTime(open.created_at)}` : undefined}>
        {open && <OrderDetail order={open} onDesignStatus={setDesignStatus} />}
      </Drawer>
    </div>
  );
}

function OrderDetail({ order: o, onDesignStatus }: { order: AdminOrder; onDesignStatus: (designId: string, status: string) => void }) {
  const st = orderState(o);
  const a = o.shipping_address;
  const name = a ? [a.first_name, a.last_name !== "-" && a.last_name].filter(Boolean).join(" ") : "";
  return (
    <div className="space-y-6">
      <DefinitionList
        items={[
          ["Status", <Status key="s" tone={st.tone}>{st.label}</Status>],
          ["Customer", o.email ?? "—"],
          ["Payment", payLabel(o) + (o.razorpay?.mode === "dummy" ? " (test)" : "")],
          ...(o.razorpay?.id ? ([["Payment reference", <span key="r" className="font-mono text-[12px]">{o.razorpay.id}</span>]] as [string, React.ReactNode][]) : []),
          ["Fulfilment", o.fulfillment_status ? o.fulfillment_status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—"],
          ["Total", <span key="t" className="font-semibold tabular-nums">{money(o.total)}</span>],
        ]}
      />

      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">Items</h3>
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {o.items.map((i) => (
            <li key={i.id} className="flex gap-3 p-3">
              {i.design?.preview ? <img src={i.design.preview} alt="" className="size-11 shrink-0 rounded border border-slate-200 object-cover" /> : null}
              <div className="min-w-0 flex-1 text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium text-slate-900">
                    {i.quantity} × {i.product_title || i.title}
                  </p>
                  <p className="shrink-0 tabular-nums text-slate-700">{money(i.quantity * i.unit_price)}</p>
                </div>
                {i.variant_title && <p className="text-slate-500">{i.variant_title}</p>}
                {i.design && (
                  <div className="mt-2 flex items-center gap-2">
                    <Status tone={designTone[i.design.status ?? "pending"] ?? "neutral"}>{designLabel(i.design.status)}</Status>
                    <select value={i.design.status} onChange={(e) => onDesignStatus(i.design!.id, e.target.value)} aria-label="Design status" className={cn(selectCls, "ml-auto h-7 text-[12px]")}>
                      {DESIGN_STEPS.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">Delivery address</h3>
        {a ? (
          <address className="text-[13px] not-italic leading-relaxed text-slate-700">
            {name}<br />
            {a.address_1}<br />
            {[a.city, a.postal_code].filter(Boolean).join(" ")}
            {a.phone && <><br />{a.phone}</>}
          </address>
        ) : (
          <p className="text-[13px] text-slate-500">No address on this order.</p>
        )}
      </section>

      <a href={`${MEDUSA_URL}/app/orders/${o.id}`} target="_blank" rel="noreferrer" className={cn(btn.secondary, "w-fit")}>
        Open in Medusa <ExternalLink size={13} />
      </a>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Package, RefreshCw, Search, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DefinitionList, Drawer, Notice, PageHeader, Segmented, Status, TableEmpty, btn, dateTime, inputCls, money, rowHover, selectCls, shortDate, table, td, th } from "./ui";
import { DESIGN_STEPS, MEDUSA_URL, SHIPMENT_STATUS_LABEL, SHIPMENT_STATUS_TONE, designLabel, designTone, orderState, type AdminOrder } from "./types";
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
  const [shipment, setShipment] = useState(o.shipment ?? null);
  const [shipBusy, setShipBusy] = useState(false);

  async function createShipment() {
    setShipBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${o.id}/shipment`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create shipment");
      toast.success(data.message ?? "Shipment creation initiated");
      // Poll for result after 4 seconds
      setTimeout(async () => {
        try {
          const r = await fetch(`/api/admin/orders/${o.id}/shipment`);
          const d = await r.json();
          if (d.shipment) setShipment(d.shipment);
        } catch { /* silent */ }
        setShipBusy(false);
      }, 4000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setShipBusy(false);
    }
  }

  async function cancelShipment() {
    if (!confirm("Cancel this Shiprocket shipment?")) return;
    setShipBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${o.id}/shipment`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel shipment");
      toast.success("Shipment cancelled");
      setShipment((s) => s ? { ...s, status: "cancelled" } : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setShipBusy(false);
    }
  }

  async function refreshTracking() {
    setShipBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${o.id}/shipment`);
      const data = await res.json();
      if (data.shipment) setShipment(data.shipment);
    } catch { /* silent */ } finally {
      setShipBusy(false);
    }
  }

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

      {/* Shipment section */}
      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
          <Truck size={12} /> Shipment
        </h3>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
          {!shipment || shipment.status === "pending" || shipment.status === "failed" ? (
            <div className="space-y-2">
              {shipment?.error && (
                <p className="text-[12px] text-red-600 flex items-center gap-1"><XCircle size={12} /> {shipment.error}</p>
              )}
              {(!shipment || shipment.status === "failed") && (
                <p className="text-[12px] text-slate-500">No Shiprocket shipment yet.</p>
              )}
              <button type="button" onClick={createShipment} disabled={shipBusy} className={cn(btn.primary, "text-[12px] h-7 px-3")}>
                <Package size={12} /> {shipBusy ? "Creating…" : "Create Shipment"}
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <Status tone={SHIPMENT_STATUS_TONE[shipment.status ?? "pending"] ?? "neutral"}>
                  {SHIPMENT_STATUS_LABEL[shipment.status ?? "pending"] ?? shipment.status}
                </Status>
                <button type="button" onClick={refreshTracking} disabled={shipBusy} className={cn(btn.ghost, "h-6 px-2 text-[11px]")}>
                  <RefreshCw size={10} className={shipBusy ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                {shipment.awb && (
                  <>
                    <dt className="text-slate-500">AWB</dt>
                    <dd className="font-mono text-slate-800">{shipment.awb}</dd>
                  </>
                )}
                {shipment.courier && (
                  <>
                    <dt className="text-slate-500">Courier</dt>
                    <dd className="text-slate-800">{shipment.courier}</dd>
                  </>
                )}
                {shipment.shiprocketOrderId && (
                  <>
                    <dt className="text-slate-500">SR Order</dt>
                    <dd className="font-mono text-slate-800">#{shipment.shiprocketOrderId}</dd>
                  </>
                )}
              </dl>
              <div className="flex flex-wrap gap-2 pt-1">
                {shipment.trackingUrl && (
                  <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className={cn(btn.secondary, "h-7 px-3 text-[12px]")}>
                    <ExternalLink size={12} /> Track Package
                  </a>
                )}
                {shipment.status !== "delivered" && shipment.status !== "cancelled" && (
                  <button type="button" onClick={cancelShipment} disabled={shipBusy} className={cn(btn.ghost, "h-7 px-3 text-[12px] text-red-600 hover:bg-red-50")}>
                    <XCircle size={12} /> Cancel
                  </button>
                )}
                {(shipment.status === "failed" || shipment.status === "cancelled") && (
                  <button type="button" onClick={createShipment} disabled={shipBusy} className={cn(btn.secondary, "h-7 px-3 text-[12px]")}>
                    <Package size={12} /> Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

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

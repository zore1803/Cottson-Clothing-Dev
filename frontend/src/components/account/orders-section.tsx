import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { formatPrice } from "@/lib/catalog";
import { Card, btnPrimary, type Order } from "./shared";

const date = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function statusOf(o: Order): { label: string; tone: string } {
  if (o.status === "canceled") return { label: "Cancelled", tone: "bg-slate-100 text-slate-600" };
  if (o.fulfillment_status === "delivered") return { label: "Delivered", tone: "bg-emerald-50 text-emerald-700" };
  if (o.fulfillment_status === "shipped" || o.fulfillment_status === "partially_shipped") return { label: "Dispatched", tone: "bg-[#DCEAF5] text-[#1F5A8C]" };
  if (o.status === "completed") return { label: "Completed", tone: "bg-emerald-50 text-emerald-700" };
  // An order only exists once its payment has been verified, so an order nobody has shipped yet is confirmed
  return { label: "Confirmed", tone: "bg-emerald-50 text-emerald-700" };
}

export function OrderCard({ order }: { order: Order }) {
  const s = statusOf(order);
  const items = order.items ?? [];
  return (
    <Link href={`/account/orders/${order.id}`} className="group block rounded-2xl border border-[#113858]/10 p-5 transition hover:border-[#113858]/30 hover:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="break-all font-mono text-[15px] font-semibold tracking-[0.06em] text-[#0B2A45]">{order.ref ?? `Order #${order.display_id}`}</p>
          <p className="text-[13px] text-[#5B7690]">Placed {date(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${s.tone}`}>{s.label}</span>
          <span className="text-[16px] font-semibold text-[#0B2A45]">{formatPrice(order.total)}</span>
        </div>
      </div>
      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-[#113858]/[0.07] border-t border-[#113858]/[0.07]">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-4 py-2.5 text-[13.5px] text-[#35516B]">
              <span className="min-w-0 truncate">
                {i.quantity} × {i.product_title || i.title}
                {i.variant_title && <span className="text-[#5B7690]"> · {i.variant_title}</span>}
              </span>
              <span className="shrink-0">{formatPrice(i.quantity * i.unit_price)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-center justify-end gap-0.5 text-[13px] font-semibold text-[#1F5A8C] group-hover:underline">
        View order details <ChevronRight size={15} />
      </p>
    </Link>
  );
}

export function EmptyOrders() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-[#113858]/20 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[#DCEAF5] text-[#113858]">
        <Package size={22} />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-[#0B2A45]">No orders yet</p>
      <p className="mt-1 text-[13.5px] text-[#5B7690]">Your orders will appear here once you place one.</p>
      <Link href="/products" className={`${btnPrimary} mt-5`}>
        Browse products
      </Link>
    </div>
  );
}

export function OrdersSection({ orders }: { orders: Order[] }) {
  return (
    <Card title="Order history" subtitle={orders.length ? `${orders.length} order${orders.length > 1 ? "s" : ""}` : undefined}>
      {orders.length ? <div className="space-y-4">{orders.map((o) => <OrderCard key={o.id} order={o} />)}</div> : <EmptyOrders />}
    </Card>
  );
}

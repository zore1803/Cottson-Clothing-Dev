import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCustomer, getToken, medusa } from "@/lib/auth";
import { connectMongo, Design, Payment, Shipment } from "@/lib/mongo";
import { OrderReceipt, type Receipt, type TimelineStep } from "@/components/checkout/order-receipt";
import { orderRef } from "@/lib/order-ref";
import { statusOf } from "@/components/account/orders-section";
import type { Order } from "@/components/account/shared";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type FullOrder = Order & {
  email?: string;
  item_total: number;
  shipping_total: number;
  shipping_address?: { first_name?: string; last_name?: string; address_1?: string; address_2?: string; city?: string; postal_code?: string; phone?: string };
};

// One order from the customer's own history. Medusa only returns it for the signed-in customer who owns it.
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, token] = await Promise.all([getCustomer(), getToken()]);
  if (!customer || !token) redirect("/api/auth/logout");

  let order: FullOrder;
  try {
    ({ order } = await medusa<{ order: FullOrder }>(
      `/store/orders/${encodeURIComponent(id)}?fields=id,display_id,status,created_at,total,item_total,shipping_total,fulfillment_status,payment_status,email,*items,*shipping_address`,
      { token }
    ));
  } catch {
    notFound();
  }

  // The payment reference lives with our own payment record; the order still shows without it
  let pay: { razorpayPaymentId?: string; method?: string; mode?: string } | null = null;
  let designStates: string[] = []; // production stage of each customised piece on this order
  let shipment: { awb?: string; courier?: string; status?: string; trackingUrl?: string } | null = null;
  try {
    await connectMongo();
    pay = await Payment.findOne({ medusaOrderId: order.id }, "razorpayPaymentId method mode").lean();
    designStates = (await Design.find({ medusaOrderId: order.id }, "status").lean()).map((d: { status: string }) => d.status);
    const s = await Shipment.findOne({ medusaOrderId: order.id }, "awb courier status trackingUrl").lean();
    if (s) shipment = { awb: s.awb ?? undefined, courier: s.courier ?? undefined, status: s.status ?? undefined, trackingUrl: s.trackingUrl ?? undefined };
  } catch {}

  const a = order.shipping_address;

  // Stages the customer sees. Dispatch and delivery come from Medusa's fulfilment status; "in production"
  // from the production board (a design moved to In production or beyond).
  const delivered = order.fulfillment_status === "delivered" || shipment?.status === "delivered";
  const dispatched = delivered || order.fulfillment_status === "shipped" || order.fulfillment_status === "partially_shipped" || (designStates.length > 0 && designStates.every((d) => d === "shipped")) || (!!shipment && ["picked_up", "in_transit", "out_for_delivery", "delivered"].includes(shipment.status ?? ""));
  const inProduction = dispatched || designStates.some((d) => d === "in_production" || d === "shipped");
  const cancelled = order.status === "canceled";
  const steps: TimelineStep[] = [
    { label: "Order confirmed", hint: "", done: true, at: new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) },
    { label: "In production", hint: "We are making your order", done: inProduction },
    { label: "Dispatched", hint: shipment?.awb ? `AWB: ${shipment.awb}${shipment.courier ? ` · ${shipment.courier}` : ""}` : "On its way soon", done: dispatched },
    { label: "Delivered", hint: "Arriving at your address", done: delivered },
  ];
  const s = !cancelled && inProduction && !dispatched ? { label: "In production", tone: "bg-amber-50 text-amber-700" } : statusOf(order);
  const receipt: Receipt = {
    orderNo: order.display_id,
    orderRef: orderRef(order.id),
    placedAt: order.created_at,
    paymentId: pay?.razorpayPaymentId,
    method: pay?.method,
    test: !!pay && pay.mode !== "razorpay",
    customer: {
      name: [a?.first_name, a?.last_name].filter(Boolean).join(" ") || [customer.first_name, customer.last_name].filter(Boolean).join(" "),
      email: order.email ?? customer.email,
      phone: a?.phone ?? customer.phone ?? "",
      address: [a?.address_1, a?.address_2].filter(Boolean).join(", "),
      city: a?.city ?? "",
      pincode: a?.postal_code ?? "",
    },
    items: (order.items ?? []).map((i) => ({ title: i.product_title || i.title, variant: i.variant_title ?? "", qty: i.quantity, unit: i.unit_price, customized: false })),
    subtotal: order.item_total,
    bulkDiscount: 0,
    shipping: order.shipping_total,
    total: order.total,
    detail: { status: s.label, tone: s.tone, steps: cancelled ? undefined : steps },
    shipment: shipment ?? undefined,
  };

  return <OrderReceipt r={receipt} />;
}


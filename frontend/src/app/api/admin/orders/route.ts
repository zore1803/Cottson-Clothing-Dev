import { medusa, fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { connectMongo, Design, Payment } from "@/lib/mongo";

type MedusaOrder = {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  total: number;
  currency_code: string;
  email: string | null;
  fulfillment_status?: string;
  payment_status?: string;
  items: { id: string; title: string; product_title?: string | null; variant_title?: string | null; quantity: number; unit_price: number; thumbnail?: string | null; metadata?: { design_id?: string } | null }[];
  shipping_address?: { first_name?: string | null; last_name?: string | null; address_1?: string | null; city?: string | null; postal_code?: string | null; phone?: string | null } | null;
};

// All orders (newest first) from Medusa, each with the status of any studio design on its lines
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  try {
    const { orders } = await medusa<{ orders: MedusaOrder[] }>(
      "/admin/orders?limit=100&order=-created_at&fields=id,display_id,status,created_at,total,currency_code,email,fulfillment_status,payment_status,*items,*shipping_address",
      { token: session.token }
    );

    const designIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.metadata?.design_id)).filter((x): x is string => !!x))];
    const designs = new Map<string, { status: string; preview?: string }>();
    const payments = new Map<string, { id?: string; status: string; mode?: string; method?: string }>();
    try {
      await connectMongo();
      for (const p of await Payment.find({ medusaOrderId: { $in: orders.map((o) => o.id) } }, "medusaOrderId razorpayPaymentId status mode method").lean())
        payments.set(String(p.medusaOrderId), { id: p.razorpayPaymentId ?? undefined, status: p.status, mode: p.mode ?? undefined, method: p.method ?? undefined });
      if (designIds.length)
        for (const d of await Design.find({ _id: { $in: designIds } }, "status preview").lean()) designs.set(String(d._id), { status: d.status ?? "pending", preview: d.preview ?? undefined });
    } catch {
      // Orders are still useful without design or payment info if Mongo is unreachable
    }

    return Response.json({
      orders: orders.map((o) => ({
        ...o,
        razorpay: payments.get(o.id),
        items: o.items.map((i) => ({ ...i, design: i.metadata?.design_id ? { id: i.metadata.design_id, ...designs.get(i.metadata.design_id) } : undefined })),
      })),
    });
  } catch (e) {
    return fail(e);
  }
}

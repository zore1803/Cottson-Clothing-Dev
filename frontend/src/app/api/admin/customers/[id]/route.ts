import { medusa, fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { connectMongo, Design } from "@/lib/mongo";
import { summarizeDesign } from "@/lib/designs";

const MEDUSA_ID = /^cus_[0-9A-Za-z]+$/;

type Order = { id: string; display_id: number; status: string; created_at: string; total: number; fulfillment_status?: string; items: { title: string; quantity: number }[] };

// One customer with their orders (from Medusa) and saved designs (from our database)
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const { id } = await params;
  if (!MEDUSA_ID.test(id)) return Response.json({ error: "Invalid customer" }, { status: 400 });
  try {
    const [{ customer }, { orders }] = await Promise.all([
      medusa<{ customer: Record<string, unknown> }>(`/admin/customers/${id}?fields=id,email,first_name,last_name,phone,company_name,created_at,has_account,metadata,*addresses`, { token: session.token }),
      medusa<{ orders: Order[] }>(`/admin/orders?customer_id=${id}&limit=100&order=-created_at&fields=id,display_id,status,created_at,total,fulfillment_status,*items`, { token: session.token }),
    ]);
    let designs: { id: string; product: string; color: string; preview?: string; status: string; summary: string; createdAt: string }[] = [];
    try {
      await connectMongo();
      const docs = await Design.find({ customerId: id }).sort({ createdAt: -1 }).limit(50).lean();
      designs = docs.map((d) => ({ id: String(d._id), product: d.product, color: d.color, preview: d.preview ?? undefined, status: d.status ?? "pending", summary: summarizeDesign(d), createdAt: String(d.createdAt) }));
    } catch {
      /* orders are still useful without designs */
    }
    const placed = orders.filter((o) => o.status !== "canceled");
    return Response.json({ customer, orders, designs, spent: placed.reduce((n, o) => n + o.total, 0), orderCount: placed.length });
  } catch (e) {
    return fail(e);
  }
}

import { connectMongo, Design, DESIGN_STATUSES } from "@/lib/mongo";
import { summarizeDesign } from "@/lib/designs";
import { requireAdmin } from "@/lib/authz";
import { getProduct } from "@/lib/catalog";

// Production queue: designs attached to placed orders (full artwork via GET /api/designs/[id] for a signed-in admin)
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const status = new URL(req.url).searchParams.get("status");
  await connectMongo();
  const filter = status && (DESIGN_STATUSES as readonly string[]).includes(status) ? { status } : { medusaOrderId: { $exists: true } };
  const docs = await Design.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return Response.json({
    designs: docs.map((d) => ({
      id: String(d._id),
      product: d.product,
      color: d.color,
      preview: d.preview,
      status: d.status,
      statusNote: d.statusNote,
      medusaOrderId: d.medusaOrderId,
      customerId: d.customerId,
      summary: summarizeDesign(d),
      createdAt: d.createdAt,
      // Production is due this many days after the order was placed (designs from before orderedAt existed count from when they were last updated)
      orderedAt: d.orderedAt ?? d.updatedAt ?? d.createdAt,
      productionDays: getProduct(d.product)?.productionDays ?? 28,
    })),
  });
}

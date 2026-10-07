import { fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { listCatalog } from "@/lib/admin-store";
import { LOW_STOCK, available, isLow } from "@/lib/stock";

// Tracked variants at or below the low-stock level, lowest first. Made-to-order variants never appear.
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  try {
    const { products } = await listCatalog(session.token);
    const items = products
      .flatMap((p) => p.variants.filter(isLow).map((v) => ({ productId: p.id, product: p.title, handle: p.handle, color: v.color, size: v.size, sku: v.sku, available: available(v) })))
      .sort((a, b) => a.available - b.available || a.product.localeCompare(b.product));
    return Response.json({ threshold: LOW_STOCK, total: items.length, out: items.filter((i) => i.available <= 0).length, items: items.slice(0, 50) });
  } catch (e) {
    return fail(e);
  }
}

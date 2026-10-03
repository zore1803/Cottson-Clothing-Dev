import { fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { setStock } from "@/lib/admin-store";
import { readJson } from "@/lib/security";

const MEDUSA_ID = /^[a-z]+_[0-9A-Za-z]+$/;
const MAX_STOCK = 1_000_000;

// Body: { quantity: number } to track stock, or { quantity: null } to make the variant made-to-order again
export async function PUT(req: Request, { params }: RouteContext<"/api/admin/products/[productId]/variants/[variantId]/stock">) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const { productId, variantId } = await params;
  const b = await readJson(req);
  if (!MEDUSA_ID.test(productId) || !MEDUSA_ID.test(variantId) || !b || !("quantity" in b)) return Response.json({ error: "Invalid request" }, { status: 400 });
  const q = b.quantity;
  if (q !== null && !(typeof q === "number" && Number.isInteger(q) && q >= 0 && q <= MAX_STOCK)) return Response.json({ error: "Quantity must be a whole number from 0 to 1,000,000, or empty for made to order" }, { status: 400 });
  try {
    await setStock(session.token, productId, variantId, q as number | null);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

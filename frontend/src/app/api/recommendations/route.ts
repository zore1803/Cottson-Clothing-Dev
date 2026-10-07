import { medusa } from "@/lib/auth";
import { getSession } from "@/lib/authz";
import { colorIdFromVariantTitle, pickedForYou, type Purchase } from "@/lib/recommendations";

type OrderLine = { product_handle?: string | null; quantity: number; variant_title?: string | null };
type StoreOrder = { status: string; items?: OrderLine[] };

// "Picked for you": suggestions from the signed-in customer's own order history.
// Guests, admins and customers with no orders get an empty list; the page then shows nothing.
export async function GET() {
  const session = await getSession();
  if (session.role !== "customer") return Response.json({ picks: [], topCategory: null, signedIn: false });

  try {
    const { orders } = await medusa<{ orders: StoreOrder[] }>("/store/orders?order=-created_at&limit=50&fields=id,status,*items", { token: session.token });
    const purchases: Purchase[] = orders
      .filter((o) => o.status !== "canceled")
      .flatMap((o) => o.items ?? [])
      .filter((i) => i.product_handle)
      .map((i) => ({ slug: i.product_handle as string, qty: i.quantity, colorId: colorIdFromVariantTitle(i.variant_title) }));

    const { products, topCategory } = pickedForYou(purchases);
    return Response.json({ picks: products.map((p) => p.slug), topCategory, signedIn: true, basedOnOrders: purchases.length > 0 });
  } catch {
    // Suggestions are a nicety; never let a Medusa hiccup break the cart page
    return Response.json({ picks: [], topCategory: null, signedIn: true });
  }
}

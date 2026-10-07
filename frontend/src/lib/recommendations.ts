import { COLORS, PRODUCTS, type Product } from "@/lib/catalog";

// Two kinds of suggestions for the cart page, both ranked with simple, explainable scores:
//  - relatedProducts: what goes with what is in the cart right now
//  - pickedForYou: what a signed-in customer is likely to want, from their past orders

export type CartLine = { slug: string; colorId?: string };
export type Purchase = { slug: string; qty: number; colorId?: string };

// Categories that are usually bought together (a team ordering polos often adds hoodies, and so on)
const COMPLEMENTS: Record<string, string[]> = {
  Polos: ["Hoodies", "Shirts", "T-Shirts"],
  Shirts: ["Polos", "Hoodies"],
  "T-Shirts": ["Polos", "Hoodies"],
  Hoodies: ["Polos", "T-Shirts", "Shirts"],
};

const byTitle = (a: Product, b: Product) => a.title.localeCompare(b.title);
const colorIdByName = new Map(COLORS.map((c) => [c.name.toLowerCase(), c.id]));

/** "Black / M" (a Medusa variant title) -> the catalog colour id for "Black" */
export const colorIdFromVariantTitle = (title?: string | null) => colorIdByName.get((title ?? "").split("/")[0].trim().toLowerCase());

/** Products that go with the cart: same category first, then complementary ones, never anything already in it */
export function relatedProducts(cart: CartLine[], limit = 8): Product[] {
  const inCart = new Set(cart.map((l) => l.slug));
  const cartProducts = cart.map((l) => PRODUCTS.find((p) => p.slug === l.slug)).filter((p): p is Product => !!p);
  if (cartProducts.length === 0) return [];

  const cartColors = new Set(cart.map((l) => l.colorId).filter(Boolean) as string[]);
  const avgPrice = cartProducts.reduce((n, p) => n + p.price, 0) / cartProducts.length;
  const sameCategory = new Set(cartProducts.map((p) => p.category));
  const complementary = new Set(cartProducts.flatMap((p) => COMPLEMENTS[p.category] ?? []));

  return PRODUCTS.filter((p) => !inCart.has(p.slug))
    .map((p) => {
      let score = sameCategory.has(p.category) ? 10 : complementary.has(p.category) ? 5 : 0;
      score += p.colors.some((c) => cartColors.has(c)) ? 2 : 0; // comes in a colour they already chose
      score += 2 * (1 - Math.min(1, Math.abs(p.price - avgPrice) / Math.max(avgPrice, 1))); // similar price range
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || byTitle(a.p, b.p))
    .slice(0, limit)
    .map((x) => x.p);
}

/**
 * Products a customer is likely to want, from what they have bought before: the categories they
 * buy most, the colours they favour and the price range they stay in. Bulk orders count by the
 * square root of the quantity so one big order doesn't drown out everything else. Products they
 * already bought, or have in the cart, are left out so the list is something new.
 */
export function pickedForYou(purchases: Purchase[], exclude: string[] = [], limit = 8): { products: Product[]; topCategory: string | null } {
  const bought = purchases.filter((x) => PRODUCTS.some((p) => p.slug === x.slug));
  if (bought.length === 0) return { products: [], topCategory: null };

  const category = new Map<string, number>();
  const color = new Map<string, number>();
  let weightSum = 0;
  let priceSum = 0;
  for (const line of bought) {
    const p = PRODUCTS.find((x) => x.slug === line.slug)!;
    const w = Math.sqrt(Math.max(1, line.qty));
    category.set(p.category, (category.get(p.category) ?? 0) + w);
    if (line.colorId) color.set(line.colorId, (color.get(line.colorId) ?? 0) + w);
    weightSum += w;
    priceSum += p.price * w;
  }
  const avgPrice = priceSum / weightSum;
  const topColor = Math.max(0, ...color.values());
  const skip = new Set([...exclude, ...bought.map((x) => x.slug)]);

  const ranked = PRODUCTS.filter((p) => !skip.has(p.slug))
    .map((p) => {
      const categoryShare = (category.get(p.category) ?? 0) / weightSum;
      const colorShare = topColor ? Math.max(0, ...p.colors.map((c) => color.get(c) ?? 0)) / topColor : 0;
      const priceFit = 1 - Math.min(1, Math.abs(p.price - avgPrice) / Math.max(avgPrice, 1));
      return { p, score: 10 * categoryShare + 3 * colorShare + 2 * priceFit };
    })
    .sort((a, b) => b.score - a.score || byTitle(a.p, b.p))
    .slice(0, limit)
    .map((x) => x.p);

  const topCategory = [...category.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { products: ranked, topCategory };
}

import "server-only";
import { medusa } from "@/lib/auth";
import { COLORS } from "@/lib/catalog";
import { BULK_TIERS } from "@/lib/pricing";

// Products added by a superadmin are also created in Medusa, shaped exactly like the seeded ones
// (backend/apps/backend/src/scripts/seed-cottson.ts): options "Garment Color" and "Garment Size",
// one variant per colour and size, made to order, with the bulk price tiers. That is what lets them
// show up under Products & stock and be bought at checkout. Always called with the superadmin's own token.

export type NewMedusaProduct = {
  slug: string;
  title: string;
  category: string;
  description: string;
  price: number;
  sizes: string[];
  colors: string[];
  originalColor: string;
  minBulk: number;
  imageUrl?: string;
  colorImages: Record<string, string>;
};

const colorName = (id: string) => COLORS.find((c) => c.id === id)?.name ?? id;

/** Same tiers as the seed: each tier runs up to the start of the next */
function priceTiers(base: number) {
  const tiers = [...BULK_TIERS].sort((a, b) => a.min - b.min);
  return [
    { amount: base, currency_code: "inr" },
    ...tiers.map((t, i) => ({
      amount: Math.round(base * (1 - t.discount)),
      currency_code: "inr",
      min_quantity: t.min,
      ...(tiers[i + 1] ? { max_quantity: tiers[i + 1].min - 1 } : {}),
    })),
  ];
}

async function categoryId(token: string, name: string) {
  const { product_categories } = await medusa<{ product_categories: { id: string; name: string }[] }>(`/admin/product-categories?q=${encodeURIComponent(name)}&limit=50&fields=id,name`, { token });
  const found = product_categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const { product_category } = await medusa<{ product_category: { id: string } }>("/admin/product-categories", { token, body: { name, is_active: true } });
  return product_category.id;
}

/** Creates the product in Medusa and returns its id. Throws (leaving nothing behind) if any step fails. */
export async function createMedusaProduct(token: string, p: NewMedusaProduct): Promise<string> {
  const [{ stores }, { shipping_profiles }, category] = await Promise.all([
    medusa<{ stores: { default_sales_channel_id: string }[] }>("/admin/stores?fields=default_sales_channel_id", { token }),
    medusa<{ shipping_profiles: { id: string }[] }>("/admin/shipping-profiles?limit=1&fields=id", { token }),
    categoryId(token, p.category),
  ]);
  const salesChannel = stores[0]?.default_sales_channel_id;
  if (!salesChannel || !shipping_profiles[0]) throw new Error("Medusa is missing a sales channel or shipping profile");

  const photo = p.imageUrl ?? p.colorImages[p.originalColor];
  const { product } = await medusa<{ product: { id: string } }>("/admin/products", {
    token,
    body: {
      title: p.title,
      handle: p.slug,
      description: p.description,
      status: "published",
      categories: [{ id: category }],
      shipping_profile_id: shipping_profiles[0].id,
      ...(photo ? { thumbnail: photo, images: [{ url: photo }] } : {}),
      metadata: { brand: "cottson", original_color: p.originalColor, color_ids: p.colors, min_bulk: p.minBulk },
      options: [
        { title: "Garment Color", values: p.colors.map(colorName) },
        { title: "Garment Size", values: p.sizes },
      ],
      sales_channels: [{ id: salesChannel }],
      variants: p.colors.flatMap((c) =>
        p.sizes.map((s) => ({
          title: `${colorName(c)} / ${s}`,
          sku: `${p.slug}-${c}-${s}`.toUpperCase(),
          manage_inventory: false, // made to order until stock is set
          options: { "Garment Color": colorName(c), "Garment Size": s },
          metadata: { color_id: c },
          prices: priceTiers(p.price),
        }))
      ),
    },
  });
  return product.id;
}

/** Removes a product from Medusa by its handle; a product Medusa never had is fine */
export async function deleteMedusaProduct(token: string, slug: string) {
  const { products } = await medusa<{ products: { id: string }[] }>(`/admin/products?handle=${encodeURIComponent(slug)}&fields=id`, { token });
  for (const p of products) await medusa(`/admin/products/${p.id}`, { token, method: "DELETE" });
}

/** Handles of every product Medusa has, to tell which shop products are missing from it */
export async function medusaHandles(token: string): Promise<Set<string>> {
  const { products } = await medusa<{ products: { handle: string }[] }>("/admin/products?limit=500&fields=handle", { token });
  return new Set(products.map((p) => p.handle));
}

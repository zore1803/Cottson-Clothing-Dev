import "server-only";
import { medusa } from "@/lib/auth";

// Store management through Medusa's Admin API, always with the signed-in admin's own token.
//
// Stock model: COTTSON is made to order, so variants start untracked (manage_inventory = false) and
// can be sold without limit. Giving a variant a quantity switches tracking on for that variant, and
// Medusa then refuses cart lines beyond the stock and counts it down as orders are placed. Clearing
// the quantity returns the variant to made-to-order.

export type StockVariant = {
  id: string;
  sku: string | null;
  color: string;
  size: string;
  tracked: boolean;
  /** Units on hand (null when untracked) */
  stocked: number | null;
  /** Units held by placed orders that haven't shipped yet */
  reserved: number | null;
};
export type StockProduct = {
  id: string;
  title: string;
  handle: string;
  category: string | null;
  status: string;
  thumbnail: string | null;
  price: number | null;
  variants: StockVariant[];
};
export type StockLocation = { id: string; name: string };

type RawVariant = {
  id: string;
  sku: string | null;
  manage_inventory: boolean;
  options?: { value: string; option?: { title: string } }[];
  prices?: { amount: number; currency_code: string; min_quantity: number | null }[];
  inventory_items?: { inventory_item_id: string }[];
};
type RawProduct = { id: string; title: string; handle: string; status: string; thumbnail: string | null; categories?: { name: string }[]; variants?: RawVariant[] };
type RawItem = { id: string; location_levels?: { location_id: string; stocked_quantity: number; reserved_quantity: number }[] };

const opt = (v: RawVariant, title: string) => v.options?.find((o) => o.option?.title === title)?.value ?? "";

export async function getStockLocation(token: string): Promise<StockLocation | null> {
  const { stock_locations } = await medusa<{ stock_locations: StockLocation[] }>("/admin/stock-locations?fields=id,name&limit=1", { token });
  return stock_locations[0] ?? null;
}

export async function listCatalog(token: string): Promise<{ products: StockProduct[]; location: StockLocation | null }> {
  const [{ products }, { inventory_items }, location] = await Promise.all([
    medusa<{ products: RawProduct[] }>(
      "/admin/products?limit=200&order=title&fields=id,title,handle,status,thumbnail,*categories,*variants,*variants.options,*variants.options.option,*variants.prices,*variants.inventory_items",
      { token }
    ),
    medusa<{ inventory_items: RawItem[] }>("/admin/inventory-items?limit=2000&fields=id,*location_levels", { token }),
    getStockLocation(token),
  ]);
  const levels = new Map(inventory_items.map((i) => [i.id, i.location_levels?.find((l) => l.location_id === location?.id)]));

  return {
    location,
    products: products
      // The customization fee is a product only so it can sit on an order line; there is nothing to stock
      .filter((p) => p.handle !== "customization")
      .map((p) => {
        const variants = (p.variants ?? []).map((v): StockVariant => {
          const level = v.manage_inventory ? levels.get(v.inventory_items?.[0]?.inventory_item_id ?? "") : undefined;
          return {
            id: v.id,
            sku: v.sku,
            color: opt(v, "Garment Color"),
            size: opt(v, "Garment Size"),
            tracked: !!v.manage_inventory,
            stocked: v.manage_inventory ? (level?.stocked_quantity ?? 0) : null,
            reserved: v.manage_inventory ? (level?.reserved_quantity ?? 0) : null,
          };
        });
        const base = p.variants?.[0]?.prices?.find((x) => x.currency_code === "inr" && x.min_quantity == null);
        return { id: p.id, title: p.title, handle: p.handle, category: p.categories?.[0]?.name ?? null, status: p.status, thumbnail: p.thumbnail, price: base?.amount ?? null, variants };
      }),
  };
}

/** Sets a variant's stock; `quantity === null` switches tracking off (made to order) */
export async function setStock(token: string, productId: string, variantId: string, quantity: number | null) {
  const base = `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`;

  if (quantity === null) {
    await medusa(base, { token, body: { manage_inventory: false } });
    return;
  }

  const location = await getStockLocation(token);
  if (!location) throw new Error("No stock location is set up in Medusa");

  const { variant } = await medusa<{ variant: RawVariant }>(`${base}?fields=id,sku,*inventory_items`, { token });
  let itemId = variant.inventory_items?.[0]?.inventory_item_id;

  if (!itemId) {
    const { inventory_item } = await medusa<{ inventory_item: { id: string } }>("/admin/inventory-items", { token, body: { sku: variant.sku ?? undefined, requires_shipping: true } });
    itemId = inventory_item.id;
    await medusa(`${base}/inventory-items`, { token, body: { inventory_item_id: itemId, required_quantity: 1 } });
  }

  const { inventory_item } = await medusa<{ inventory_item: { location_levels?: { location_id: string }[] } }>(`/admin/inventory-items/${itemId}?fields=id,*location_levels`, { token });
  if (inventory_item.location_levels?.some((l) => l.location_id === location.id)) {
    await medusa(`/admin/inventory-items/${itemId}/location-levels/${location.id}`, { token, body: { stocked_quantity: quantity } });
  } else {
    await medusa(`/admin/inventory-items/${itemId}/location-levels`, { token, body: { location_id: location.id, stocked_quantity: quantity } });
  }
  await medusa(base, { token, body: { manage_inventory: true } });
}

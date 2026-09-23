// Catalog access. Today it reads local JSON; the functions are shaped so they can be
// swapped for Medusa Store API calls (GET /store/products) without changing the pages.
import data from "@/data/products.json";

export type Color = { id: string; name: string; hex: string };
export type Product = {
  slug: string;
  title: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  sizes: string[];
  originalColor: string;
  colors: string[];
  minBulk: number;
  /** Number of alternate poses under /products/<slug>/photos/<n>/, each with its own
   * model-photo.png + garment-layer.png (see scripts/import-poses.mjs). Products without this
   * field only have the single root-level photo (the older single-pose layout). */
  poses?: number;
};

/** From the live overlay-blend recolor canvas: image size + the garment's bounding box (for print-area placement) */
export type GarmentMeta = { width: number; height: number; bbox: [number, number, number, number] };

export const COLORS: Color[] = data.colors;
export const PRODUCTS: Product[] = data.products;

export const colorById = (id: string) => COLORS.find((c) => c.id === id)!;
export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export const assetUrl = (
  slug: string,
  file: "photo.jpg" | "model-photo.png" | "garment-layer.png",
  pose?: number
) => (pose !== undefined ? `/products/${slug}/photos/${pose}/${file}` : `/products/${slug}/${file}`);
// Pre-rendered catalog color (see scripts/render-variants.mjs); the original color is the photo itself
export const variantUrl = (p: Product, colorId: string) =>
  colorId === p.originalColor ? assetUrl(p.slug, "photo.jpg") : `/products/${p.slug}/variants/${colorId}.webp`;

export const formatPrice = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

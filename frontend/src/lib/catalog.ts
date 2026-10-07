// Catalog access. Today it reads local JSON; the functions are shaped so they can be
// swapped for Medusa Store API calls (GET /store/products) without changing the pages.
import data from "@/data/products.json";
import colorData from "@/data/colors.json";

export type Color = { id: string; name: string; hex: string };
export type Product = {
  imageUrl?: string;
  colorImages?: Record<string, string>;
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
  /** Optional attributes used by the listing filters; missing = not set (production defaults to 28 days) */
  productionDays?: number;
  customColor?: boolean;
  printOnDemand?: boolean;
  livePreview?: boolean;
  express?: boolean;
  promo?: boolean;
  /** Number of alternate poses under /products/<slug>/photos/<n>/, each with its own
   * model-photo.webp + garment-layer.webp (see scripts/import-poses.mjs). Products without this
   * field only have the single root-level photo (the older single-pose layout). */
  poses?: number;
  /** Where the garment sits in the product photo, as fractions of the 2:3 photo frame
   * (scripts/measure-fit.mjs): torso width, top of the garment, torso centre. Lets logos be
   * sized and placed in real cm; without it the Essential Polo photo's framing is assumed. */
  fit?: Fit;
};

export type Fit = { chest: number; top: number; cx: number };

/** From the live overlay-blend recolor canvas: image size + the garment's bounding box (for print-area placement) */
export type GarmentMeta = { width: number; height: number; bbox: [number, number, number, number] };

/** Body / sleeve / collar swatches */
export const GARMENT_COLORS: Color[] = colorData.garment;
/** Collar and sleeve tipping swatches */
export const TRIM_COLORS: Color[] = colorData.trim;
/** Every stock colour once (ids are shared between the two lists) */
export const COLORS: Color[] = [...GARMENT_COLORS, ...TRIM_COLORS.filter((t) => !GARMENT_COLORS.some((g) => g.id === t.id))];
export const PRODUCTS: Product[] = data.products;

export const colorById = (id: string) => COLORS.find((c) => c.id === id)!;
export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export const assetUrl = (
  slug: string,
  file: "photo.jpg" | "model-photo.webp" | "garment-layer.webp",
  pose?: number
) => (pose !== undefined ? `/products/${slug}/photos/${pose}/${file}` : `/products/${slug}/${file}`);
// Pre-rendered catalog color (see scripts/render-variants.mjs); the original color is the photo itself
export const variantUrl = (p: Product, colorId: string) =>
  p.colorImages?.[colorId] ?? p.imageUrl ?? (colorId === p.originalColor ? assetUrl(p.slug, "photo.jpg") : `/products/${p.slug}/variants/${colorId}.webp`);

export const formatPrice = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

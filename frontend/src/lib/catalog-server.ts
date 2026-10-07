import "server-only";
import { PRODUCTS, type Product } from "./catalog";
import { CatalogProduct, HiddenProduct, connectMongo } from "./mongo";
import { normalizeColorImages } from "./product-colors";

/** The shop catalogue. Products a superadmin removed are left out unless `includeHidden` is set (for the superadmin screen). */
export async function listProducts({ includeHidden = false } = {}): Promise<Product[]> {
  if (!process.env.MONGODB_URI) return PRODUCTS;
  await connectMongo();
  const [added, hidden] = await Promise.all([
    CatalogProduct.find().sort({ createdAt: -1 }).lean(),
    includeHidden ? [] : HiddenProduct.find().lean(),
  ]);
  const gone = new Set(hidden.map((h) => String(h.slug)));
  return [...PRODUCTS.filter((p) => !gone.has(p.slug)), ...added.map((p) => ({
    slug: String(p.slug), title: String(p.title), category: String(p.category),
    description: String(p.description), price: Number(p.price), currency: String(p.currency),
    sizes: p.sizes as string[], colors: p.colors as string[], originalColor: String(p.originalColor),
    minBulk: Number(p.minBulk), productionDays: Number(p.productionDays),
    imageUrl: p.imageUrl ? String(p.imageUrl) : undefined,
    colorImages: normalizeColorImages(p.colorImages),
    customColor: Boolean(p.customColor), printOnDemand: Boolean(p.printOnDemand),
    express: Boolean(p.express), promo: Boolean(p.promo), livePreview: false,
  }))];
}

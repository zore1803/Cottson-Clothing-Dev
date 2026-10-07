import "server-only";
import { PRODUCTS, type Product } from "./catalog";
import { CatalogProduct, connectMongo } from "./mongo";
import { normalizeColorImages } from "./product-colors";

export async function listProducts(): Promise<Product[]> {
  if (!process.env.MONGODB_URI) return PRODUCTS;
  await connectMongo();
  const added = await CatalogProduct.find().sort({ createdAt: -1 }).lean();
  return [...PRODUCTS, ...added.map((p) => ({
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

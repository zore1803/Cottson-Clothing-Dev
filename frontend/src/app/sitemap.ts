import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { listProducts } from "@/lib/catalog-server";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/products", priority: 0.9, changeFrequency: "daily" },
  { path: "/studio", priority: 0.7, changeFrequency: "monthly" },
  { path: "/clients", priority: 0.6, changeFrequency: "monthly" },
  { path: "/resources", priority: 0.5, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Includes products a superadmin added and leaves out ones they hid; falls back to the bundled catalogue if the database is down
  const products = await listProducts().catch(() => PRODUCTS);
  const now = new Date();
  return [
    ...PAGES.map((p) => ({ url: absoluteUrl(p.path), lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}

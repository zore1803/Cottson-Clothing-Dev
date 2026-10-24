import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog-server";
import { CategoryFilter } from "@/components/category-filter";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Shop Custom Polos, T-shirts & Hoodies",
  description: "Browse Cottson's custom corporate clothing: polos, T-shirts, hoodies and shirts in your colours, with your logo embroidered or printed. Bulk pricing available.",
  alternates: { canonical: "/products" },
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await listProducts();
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Cottson custom clothing",
    itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/products/${p.slug}`), name: p.title })),
  };
  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:pt-32">
      <JsonLd data={list} />
      <CategoryFilter products={products} />
    </div>
  );
}

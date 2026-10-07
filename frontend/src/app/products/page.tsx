import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog-server";
import { CategoryFilter } from "@/components/category-filter";

export const metadata: Metadata = { title: "Shop" };

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:pt-32">
      <CategoryFilter products={products} />
    </div>
  );
}

import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { CategoryFilter } from "@/components/category-filter";

export const metadata: Metadata = { title: "Shop" };

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:pt-32">
      <CategoryFilter products={PRODUCTS} />
    </div>
  );
}

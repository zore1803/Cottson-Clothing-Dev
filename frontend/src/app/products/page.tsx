import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const { category } = await searchParams;
  const categories = [...new Set(PRODUCTS.map((p) => p.category))];
  const list = typeof category === "string" ? PRODUCTS.filter((p) => p.category === category) : PRODUCTS;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Shop</h1>
      <div className="mt-6 flex gap-2">
        {[undefined, ...categories].map((c) => (
          <Link
            key={c ?? "all"}
            href={c ? `/products?category=${c}` : "/products"}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              (category ?? undefined) === c ? "border-foreground bg-foreground text-background" : "hover:bg-muted"
            )}
          >
            {c ?? "All"}
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}

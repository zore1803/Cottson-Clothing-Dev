"use client";

import { useState } from "react";
import Link from "next/link";
import { PRODUCTS, type Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

const TABS: { label: string; filter: (p: Product) => boolean }[] = [
  { label: "Bestsellers", filter: () => true },
  { label: "Shirts", filter: (p) => p.category === "Shirts" },
  { label: "Polos", filter: (p) => p.category === "Polos" },
  { label: "T-Shirts", filter: (p) => p.category === "T-Shirts" },
];

export function ProductTabs() {
  const [active, setActive] = useState(0);
  const items = PRODUCTS.filter(TABS[active].filter);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
            The right product for any use case<span className="text-brand-accent">.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Choose from our growing catalog of formal shirts, polos and tees — every piece made to order in your
            colors, with your logo.
          </p>
        </div>
        <Link href="/products" className="hidden shrink-0 text-sm font-medium hover:underline sm:block">
          View all
        </Link>
      </div>

      <div className="mt-8 flex w-fit flex-wrap gap-1 rounded-xl bg-muted/40 p-1">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              i === active ? "bg-background text-brand shadow-sm" : "text-muted-foreground hover:text-brand"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>

      <Link href="/products" className="mt-6 block text-center text-sm font-medium hover:underline sm:hidden">
        View all
      </Link>
    </section>
  );
}

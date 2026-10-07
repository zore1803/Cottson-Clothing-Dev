"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

export function SimilarProductsCarousel({ products, title = "Similar products" }: { products: Product[]; title?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#607487] sm:text-[12px]">Keep exploring</p>
          <h2 className="text-[28px] font-bold tracking-[-0.025em] text-[#113858] sm:text-[34px]">{title}</h2>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="grid size-10 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="grid size-10 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-8 snap-x snap-mandatory sm:mx-0 sm:gap-6 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {products.map((p) => (
          <div key={p.slug} className="w-[70vw] shrink-0 snap-start sm:w-64 md:w-72">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

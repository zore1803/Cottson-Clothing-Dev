"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { type Product, variantUrl, formatPrice } from "@/lib/catalog";
import { ColorSwatches } from "@/components/color-swatches";

/** Listing card: swaps between pre-rendered color images from the CDN (no live rendering here) */
export function ProductCard({ product }: { product: Product }) {
  const [color, setColor] = useState(product.originalColor);
  const href = `/products/${product.slug}?color=${color}`;
  return (
    <div className="group flex w-full flex-col overflow-hidden rounded-[24px] bg-[#F5F8FA] transition-shadow duration-300 hover:shadow-[0_18px_40px_rgba(17,56,88,0.14)]">
      <div className="relative overflow-hidden">
        <Link href={href} className="block" aria-label={product.title}>
          <Image
            src={variantUrl(product, color)}
            alt={`${product.title} in ${color}`}
            width={1080}
            height={1440}
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5 text-[12px] font-semibold text-[#113858]">
          <span className="rounded-full bg-white/95 px-3 py-1 shadow-sm">{product.productionDays ?? 28} days</span>
          <span className="rounded-full bg-white/95 px-3 py-1 shadow-sm">Min. {product.minBulk} units</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/25 to-transparent px-3 pb-3 pt-10">
          <ColorSwatches colorIds={product.colors} value={color} onChange={setColor} size="sm" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#607487]">{product.category}</p>
        <Link href={href} className="mt-1 text-[17px] font-bold leading-snug tracking-[-0.01em] text-[#113858] hover:underline">
          {product.title}
        </Link>
        <p className="mt-auto pt-3 text-[14px] text-[#607487]">
          Starting from <span className="font-semibold text-[#113858]">{formatPrice(product.price, product.currency)}</span>
        </p>
      </div>
    </div>
  );
}

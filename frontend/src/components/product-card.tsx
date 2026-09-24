"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { type Product, variantUrl, formatPrice } from "@/lib/catalog";
import { ColorSwatches } from "@/components/color-swatches";

/** Listing card: swaps between pre-rendered color images from the CDN (no live rendering here) */
export function ProductCard({ product }: { product: Product }) {
  const [color, setColor] = useState(product.originalColor);
  return (
    <div className="group mx-auto w-2/3">
      <Link href={`/products/${product.slug}?color=${color}`} className="block overflow-hidden rounded-xl bg-muted">
        <Image
          src={variantUrl(product, color)}
          alt={`${product.title} in ${color}`}
          width={1080}
          height={1440}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <Link href={`/products/${product.slug}?color=${color}`} className="font-medium hover:underline">
            {product.title}
          </Link>
          <div className="text-sm text-muted-foreground">{product.category}</div>
        </div>
        <div className="font-medium">{formatPrice(product.price, product.currency)}</div>
      </div>
      <div className="mt-3">
        <ColorSwatches colorIds={product.colors} value={color} onChange={setColor} size="sm" />
      </div>
    </div>
  );
}

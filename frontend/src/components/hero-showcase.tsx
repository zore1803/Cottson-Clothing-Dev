"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getProduct, colorById, variantUrl } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const product = getProduct("formal-shirt-grey")!;
const SHOWCASE = product.colors;

/** Hero image: the real shirt photo in the chosen color (pre-rendered variants, instant swap) */
export function HeroShowcase() {
  const [color, setColor] = useState(product.originalColor);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#b9bcc2]">
      {/* All variants stacked; only the chosen one is visible, so switching never flickers */}
      <div className="relative aspect-[4/5]">
        {SHOWCASE.map((id, i) => (
          <Image
            key={id}
            src={variantUrl(product, id)}
            alt={`${product.title} in ${colorById(id).name}`}
            fill
            priority={id === product.originalColor}
            loading={id === product.originalColor ? undefined : i < 4 ? "eager" : "lazy"}
            sizes="(min-width: 1024px) 560px, 100vw"
            className={cn("object-cover object-top transition-opacity duration-300", color === id ? "opacity-100" : "opacity-0")}
          />
        ))}
      </div>

      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-3 rounded-2xl bg-background/95 p-3 pl-4 shadow-lg backdrop-blur">
        <div className="mr-auto">
          <div className="text-xs text-muted-foreground">Try a color</div>
          <div className="font-semibold text-brand">{colorById(color).name}</div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Shirt color">
          {SHOWCASE.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={color === id}
              aria-label={colorById(id).name}
              title={colorById(id).name}
              onClick={() => setColor(id)}
              className={cn(
                "size-7 rounded-full border-2 border-background ring-1 ring-border transition-transform hover:scale-110",
                color === id && "ring-2 ring-brand"
              )}
              style={{ background: colorById(id).hex }}
            />
          ))}
        </div>
        <Link
          href={`/products/${product.slug}?color=${color}`}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
        >
          Shop this
        </Link>
      </div>
    </div>
  );
}

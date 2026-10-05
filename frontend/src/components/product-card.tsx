"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  type Product,
  formatPrice,
  colorById,
} from "@/lib/catalog";
import { ColorSwatches } from "@/components/color-swatches";
import { imageForColor } from "@/components/design-studio/garment-photo";

/** Listing card: swaps between pre-rendered color images from the CDN */
export function ProductCard({ product }: { product: Product }) {
  const [color, setColor] = useState(product.originalColor);
  const [previousColor, setPreviousColor] = useState<string | null>(null);
  const [ready, setReady] = useState(true);

  const photoFor = (id: string) => imageForColor(product, id);

  const src = photoFor(color);

  /*
   * Preload the newly selected color image.
   *
   * This makes the first click reliable as well as
   * subsequent clicks, even when the CDN/browser cache
   * behaves differently.
   */
  useEffect(() => {
    let cancelled = false;

    setReady(false);

    const img = new window.Image();

    const markReady = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    img.onload = markReady;
    img.onerror = markReady;
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  const changeColor = (next: string) => {
    if (next === color) return;

    setPreviousColor(color);
    setReady(false);
    setColor(next);
  };

  const href = `/products/${product.slug}?color=${color}`;

  return (
    <div className="group flex w-full flex-col overflow-hidden rounded-[24px] bg-[#F5F8FA] transition-shadow duration-300 hover:shadow-[0_18px_40px_rgba(17,56,88,0.14)]">
      <div className="relative overflow-hidden">
        <Link
          href={href}
          className="relative block aspect-[3/4]"
          aria-label={product.title}
        >
          {/* Previous color stays underneath during the transition */}
          {previousColor && (
            <Image
              src={photoFor(previousColor)}
              alt=""
              fill
              unoptimized={product.slug === "polo-black"}
              sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}

          {/* New selected color */}
          <div
            key={src}
            className={`absolute inset-0 ${
              previousColor && ready ? "color-reveal" : ""
            }`}
            style={{
              clipPath:
                previousColor && !ready
                  ? "inset(0 100% 0 0)"
                  : undefined,
            }}
            onAnimationEnd={() => {
              setPreviousColor(null);
            }}
          >
            <Image
              src={src}
              alt={`${product.title} in ${colorById(color).name}`}
              fill
              unoptimized={product.slug === "polo-black"}
              sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
              className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>

          {/* Moving highlight during color change */}
          {previousColor && ready && (
            <div
              key={`highlight-${src}`}
              className="color-highlight pointer-events-none absolute inset-y-0 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent blur-md"
            />
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5 text-[12px] font-semibold text-[#113858]">
          <span className="rounded-full bg-white/95 px-3 py-1 shadow-sm">
            {product.productionDays ?? 28} days
          </span>

          <span className="rounded-full bg-white/95 px-3 py-1 shadow-sm">
            Min. {product.minBulk} units
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/25 to-transparent px-3 pb-3 pt-10">
          <ColorSwatches
            colorIds={product.colors}
            value={color}
            onChange={changeColor}
            size="sm"
          />
        </div>
      </div>

      <style jsx>{`
        .color-reveal {
          animation: reveal 650ms ease-in-out both;
        }

        .color-highlight {
          animation: highlight 650ms ease-in-out both;
        }

        @keyframes reveal {
          from {
            clip-path: inset(0 100% 0 0);
          }

          to {
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes highlight {
          from {
            left: 0%;
          }

          to {
            left: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-reveal {
            animation-duration: 1ms;
          }

          .color-highlight {
            display: none;
          }
        }
      `}</style>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#607487]">
          {product.category}
        </p>

        <Link
          href={href}
          className="mt-1 text-[17px] font-bold leading-snug tracking-[-0.01em] text-[#113858] hover:underline"
        >
          {product.title}
        </Link>

        <p className="mt-auto pt-3 text-[14px] text-[#607487]">
          Starting from{" "}
          <span className="font-semibold text-[#113858]">
            {formatPrice(product.price, product.currency)}
          </span>
        </p>
      </div>
    </div>
  );
}

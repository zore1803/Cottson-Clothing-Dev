"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Palette, Plus, Minus } from "lucide-react";
import { type Product, colorById, variantUrl, formatPrice } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

/** Product detail page for the Essential Polo: same wave-sweep trim-color swap as
 * /mockup, but wired to the real catalog (price, sizes, minBulk) and the real cart. */
export function EssentialPoloDetail({ product, initialColor }: { product: Product; initialColor: string }) {
  const add = useCart((s) => s.add);
  const [colorId, setColorId] = useState(initialColor);
  const [baseColorId, setBaseColorId] = useState(initialColor);
  const [incomingColorId, setIncomingColorId] = useState<string | null>(null);
  const [swept, setSwept] = useState(false);
  const [sizes, setSizes] = useState<Record<string, number>>({});

  const color = colorById(colorId);
  const totalQty = Object.values(sizes).reduce((n, q) => n + q, 0);
  const setSize = (s: string, qty: number) => setSizes((prev) => ({ ...prev, [s]: Math.max(0, qty) }));

  const selectColor = (id: string) => {
    if (id === colorId) return;
    setColorId(id);
    window.history.replaceState(null, "", `?color=${id}`);
    setIncomingColorId(id);
    setSwept(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setSwept(true)));
    window.setTimeout(() => {
      setBaseColorId(id);
      setIncomingColorId(null);
      setSwept(false);
    }, 650);
  };

  const addToCart = () => {
    if (totalQty < product.minBulk) {
      toast.error(`Minimum order is ${product.minBulk} pieces (you have ${totalQty})`);
      return;
    }
    for (const [size, qty] of Object.entries(sizes)) {
      if (qty > 0) add({ slug: product.slug, title: product.title, colorId, colorName: color.name, size, qty, basePrice: product.price });
    }
    toast.success(`Added ${totalQty} × ${product.title} (${color.name}) to cart`);
    setSizes({});
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="text-sm text-muted-foreground">
        <Link href="/products" className="hover:underline">
          Shop
        </Link>{" "}
        / {product.category}
      </div>

      <div className="mt-6 grid gap-10 overflow-hidden rounded-2xl border lg:grid-cols-2">
        {/* Left: photo with the wave-sweep color swap */}
        <div className="relative bg-muted">
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            <Image
              src={variantUrl(product, baseColorId)}
              alt={`${product.title} — ${colorById(baseColorId).name}`}
              fill
              sizes="600px"
              className="object-contain"
            />
            {incomingColorId && (
              <div
                className="absolute inset-0 transition-[clip-path] duration-[650ms] ease-in-out"
                style={{ clipPath: `inset(0 ${swept ? "0%" : "100%"} 0 0)` }}
              >
                <Image
                  src={variantUrl(product, incomingColorId)}
                  alt={`${product.title} — ${colorById(incomingColorId).name}`}
                  fill
                  sizes="600px"
                  className="object-contain"
                />
              </div>
            )}
            {incomingColorId && (
              <div
                className="pointer-events-none absolute inset-y-0 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-background/70 to-transparent blur-md transition-[left] duration-[650ms] ease-in-out"
                style={{ left: swept ? "100%" : "0%" }}
              />
            )}
          </div>
          <button
            type="button"
            disabled
            className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-muted-foreground shadow-sm disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            disabled
            className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-muted-foreground shadow-sm disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Right: title, design studio CTA, trim color, sizes, price + add to cart */}
        <div className="p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-brand">{product.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>

          <Link
            href="/studio"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90"
          >
            <Palette className="size-4" /> Design Studio — design it yourself!
          </Link>

          <div className="mt-8">
            <div className="text-sm font-semibold text-brand">1. Collar color — {color.name}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {product.colors.map((id) => {
                const c = colorById(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectColor(id)}
                    aria-label={c.name}
                    title={c.name}
                    className={cn(
                      "size-9 rounded-full ring-1 ring-border transition-shadow",
                      colorId === id && "ring-2 ring-offset-2 ring-brand"
                    )}
                    style={{ background: c.hex }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <div className="text-sm font-semibold text-brand">2. Choose sizes (min. order {product.minBulk})</div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {product.sizes.map((s) => (
                <div key={s} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm font-semibold">{s}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSize(s, (sizes[s] ?? 0) - 1)}
                      className="grid size-6 place-items-center rounded-md hover:bg-muted"
                      aria-label={`Fewer ${s}`}
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-5 text-center text-sm tabular-nums">{sizes[s] ?? 0}</span>
                    <button
                      type="button"
                      onClick={() => setSize(s, (sizes[s] ?? 0) + 1)}
                      className="grid size-6 place-items-center rounded-md hover:bg-muted"
                      aria-label={`More ${s}`}
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <div className="text-sm">
              <div className="text-muted-foreground">Lead time</div>
              <div className="font-semibold text-brand">7–10 business days</div>
              <div className="mt-1 text-muted-foreground">Price</div>
              <div className="font-semibold text-brand">{formatPrice(product.price, product.currency)} per piece</div>
            </div>
            <button
              type="button"
              onClick={addToCart}
              className="h-11 shrink-0 rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:bg-brand/90"
            >
              Add to cart ({totalQty})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

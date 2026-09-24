"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ImagePlus, Palette, Plus, Minus, X } from "lucide-react";
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

  // Logo overlay: a sibling layer on top of the photo, independent of which color image
  // is showing underneath — so it stays put across color swaps without any extra work.
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoPos, setLogoPos] = useState({ x: 50, y: 42 }); // % of the photo container
  const [logoSize, setLogoSize] = useState(80); // px
  const [application, setApplication] = useState<"print" | "embroidery">("print");
  const photoRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onLogoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setLogoSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const movePointerTo = (clientX: number, clientY: number) => {
    const rect = photoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(95, Math.max(5, ((clientY - rect.top) / rect.height) * 100));
    setLogoPos({ x, y });
  };

  const onLogoPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onLogoPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    movePointerTo(e.clientX, e.clientY);
  };
  const onLogoPointerUp = () => {
    draggingRef.current = false;
  };

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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-10 overflow-hidden rounded-2xl border lg:grid-cols-2">
        {/* Left: photo with the wave-sweep color swap */}
        <div className="relative bg-muted">
          <div ref={photoRef} className="relative aspect-square w-full overflow-hidden">
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

            {/* Logo overlay: independent of the color layers below, so it carries over to
                every trim color automatically — never baked into a specific photo. */}
            {logoSrc && (
              <img
                src={logoSrc}
                alt="Your logo"
                onPointerDown={onLogoPointerDown}
                onPointerMove={onLogoPointerMove}
                onPointerUp={onLogoPointerUp}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none active:cursor-grabbing",
                  application === "embroidery" && "contrast-110 saturate-75"
                )}
                style={{
                  left: `${logoPos.x}%`,
                  top: `${logoPos.y}%`,
                  width: logoSize,
                  filter:
                    application === "embroidery"
                      ? "drop-shadow(0 1px 0.5px rgba(0,0,0,0.45)) drop-shadow(0 0 0.5px rgba(255,255,255,0.6))"
                      : "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
                }}
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
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold text-brand">{product.title}</h1>
            <Link
              href="/studio"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-muted"
            >
              <Palette className="size-3.5" /> Design Studio
            </Link>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>

          <Link
            href="/studio"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90"
          >
            <Palette className="size-4" /> Design Studio — design it yourself!
          </Link>

          <div className="mt-8">
            <div className="text-sm font-semibold text-brand">1. Add your logo</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLogoFile(f);
                e.target.value = "";
              }}
            />
            {!logoSrc ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground hover:border-brand hover:text-brand"
              >
                <ImagePlus className="size-4" /> Upload logo
              </button>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">Drag the logo on the photo to place it.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(["print", "embroidery"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setApplication(a)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize",
                        application === a ? "border-brand bg-brand text-white" : "text-muted-foreground hover:border-brand"
                      )}
                    >
                      {a === "embroidery" ? "Stitched (Embroidery)" : "Print"}
                    </button>
                  ))}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Size
                    <input
                      type="range"
                      min={40}
                      max={160}
                      value={logoSize}
                      onChange={(e) => setLogoSize(Number(e.target.value))}
                      className="w-20"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLogoSrc(null)}
                    aria-label="Remove logo"
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-8">
            <div className="text-sm font-semibold text-brand">2. Collar color — {color.name}</div>
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
            <div className="text-sm font-semibold text-brand">3. Choose sizes (min. order {product.minBulk})</div>
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

"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import { type Product, colorById, formatPrice } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { bulkDiscount, garmentUnitPrice } from "@/lib/pricing";
import { RecolorCanvas } from "@/components/recolor-canvas";
import { ColorSwatches } from "@/components/color-swatches";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductConfigurator({ product, initialColor }: { product: Product; initialColor: string }) {
  const [colorId, setColorId] = useState(initialColor);
  const [pantsId, setPantsId] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);

  const color = colorById(colorId);
  const discount = bulkDiscount(qty);
  const unit = garmentUnitPrice(product.price, qty);

  const changeColor = (id: string) => {
    setColorId(id);
    // Shareable URL for the chosen color, without a navigation
    window.history.replaceState(null, "", `?color=${id}`);
  };

  const addToCart = () => {
    if (!size) return toast.error("Please choose a size");
    add({ slug: product.slug, title: product.title, colorId, colorName: color.name, size, qty, basePrice: product.price });
    toast.success(`Added ${qty} × ${product.title} (${color.name}, ${size})`);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <RecolorCanvas
          slug={product.slug}
          topColor={colorId === product.originalColor ? null : color.hex}
          pantsColor={pantsId ? colorById(pantsId).hex : null}
          className="rounded-2xl"
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">Live preview on the real garment</p>
      </div>

      <div>
        <div className="text-sm text-muted-foreground">
          <Link href="/products" className="hover:underline">Shop</Link> / {product.category}
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{product.title}</h1>
        <div className="mt-3 flex items-baseline gap-3 text-2xl">
          {formatPrice(unit, product.currency)}
          {discount > 0 && (
            <>
              <span className="text-base text-muted-foreground line-through">{formatPrice(product.price, product.currency)}</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Bulk −{Math.round(discount * 100)}%
              </span>
            </>
          )}
        </div>
        <p className="mt-5 text-muted-foreground">{product.description}</p>

        <div className="mt-8">
          <div className="text-sm font-medium">
            Color: <span className="font-normal text-muted-foreground">{color.name}</span>
          </div>
          <div className="mt-3">
            <ColorSwatches colorIds={product.colors} value={colorId} onChange={changeColor} />
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm font-medium">
            Style it with trousers:{" "}
            <span className="font-normal text-muted-foreground">{pantsId ? colorById(pantsId).name : "As photographed"}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <ColorSwatches colorIds={product.pantsColors} value={pantsId ?? ""} onChange={setPantsId} size="sm" />
            {pantsId && (
              <button className="text-xs text-muted-foreground underline" onClick={() => setPantsId(null)}>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-medium">Size</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={cn(
                  "h-11 min-w-14 rounded-lg border px-4 text-sm font-medium transition-colors",
                  size === s ? "border-foreground bg-foreground text-background" : "hover:border-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center rounded-lg border">
            <button className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">
              <Minus className="size-4" />
            </button>
            <input
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 bg-transparent text-center text-sm outline-none"
              inputMode="numeric"
              aria-label="Quantity"
            />
            <button className="grid size-11 place-items-center" onClick={() => setQty((q) => q + 1)} aria-label="More">
              <Plus className="size-4" />
            </button>
          </div>
          <Button size="lg" className="h-11 flex-1 px-6" onClick={addToCart}>
            Add to cart · {formatPrice(unit * qty, product.currency)}
          </Button>
        </div>

        <Link
          href={`/studio?product=${product.slug}&color=${colorId}`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-3 h-11 w-full")}
        >
          <Palette /> Add your logo in the Design Studio
        </Link>

        <ul className="mt-8 space-y-2 border-t pt-6 text-sm text-muted-foreground">
          {[
            "100% premium cotton",
            `Bulk pricing from ${product.minBulk} pieces: 10% off, 50+: 15%, 100+: 20%`,
            "Ships in 7–10 days · Free shipping above ₹1,999",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

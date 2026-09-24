"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Palette, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = "/mockup/polo-green.png";
const MASK = "/mockup/polo-trim-mask.png";

const PRESETS = [
  { name: "Green Trim", hex: "#7ac142" },
  { name: "Black Trim", hex: "#1c1c1c" },
  { name: "Navy Trim", hex: "#1f2a44" },
  { name: "Red Trim", hex: "#c8102e" },
  { name: "White Trim", hex: "#f5f5f2" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const MIN_ORDER = 25;
const UNIT_PRICE = 499;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Live collar/sleeve trim recolor: overlay-blends the picked color with the trim's own
 * grayscale luminance (polo-trim-mask.png, see scripts/make-collar-mask.mjs) on a 2D
 * canvas, then clips back to the mask's alpha — same technique as the Studio's live
 * recolor shader, so shading/folds stay intact instead of flattening to one flat color. */
export function MockupLiveCustomizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<{ base: HTMLImageElement; mask: HTMLImageElement } | null>(null);
  const [color, setColor] = useState(PRESETS[0].hex);
  const [ready, setReady] = useState(false);
  const [sizes, setSizes] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadImage(BASE), loadImage(MASK)]).then(([base, mask]) => {
      if (cancelled) return;
      imagesRef.current = { base, mask };
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = base.width;
        canvas.height = base.height;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const imgs = imagesRef.current;
    if (!canvas || !imgs || !ready) return;
    const { base, mask } = imgs;
    const W = base.width, H = base.height;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);

    const layer = document.createElement("canvas");
    layer.width = W;
    layer.height = H;
    const lctx = layer.getContext("2d")!;

    lctx.drawImage(mask, 0, 0);
    lctx.globalCompositeOperation = "overlay";
    const [r, g, b] = hexToRgb(color);
    lctx.fillStyle = `rgb(${r},${g},${b})`;
    lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(mask, 0, 0);

    ctx.drawImage(layer, 0, 0);
  }, [color, ready]);

  const activePreset = PRESETS.find((p) => p.hex === color);
  const totalQty = Object.values(sizes).reduce((n, q) => n + q, 0);
  const setSize = (s: string, qty: number) => setSizes((prev) => ({ ...prev, [s]: Math.max(0, qty) }));

  const addToBasket = () => {
    if (totalQty < MIN_ORDER) {
      toast.error(`Minimum order is ${MIN_ORDER} pieces (you have ${totalQty})`);
      return;
    }
    toast.success(`Added ${totalQty} × Essential Polo (${activePreset?.name ?? "custom trim"}) to basket`);
  };

  return (
    <div className="grid gap-10 overflow-hidden rounded-2xl border lg:grid-cols-2">
      {/* Left: big product photo with carousel-style controls (single view for now) */}
      <div className="relative bg-muted">
        <div className="relative aspect-[3/4] w-full">
          <canvas ref={canvasRef} className="size-full object-contain" />
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
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          <span className="size-2 rounded-full bg-brand" />
          <span className="size-2 rounded-full bg-foreground/20" />
          <span className="size-2 rounded-full bg-foreground/20" />
        </div>
      </div>

      {/* Right: title, design studio CTA, trim color, sizes, price + add to basket */}
      <div className="p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-brand">
          COTTSON<span className="text-brand-accent">.</span> Essential Polo
        </h2>

        <Link
          href="/studio"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90"
        >
          <Palette className="size-4" /> Design Studio — design it yourself!
        </Link>

        <div className="mt-8">
          <div className="text-sm font-semibold text-brand">
            1. Collar color — {activePreset?.name ?? "Custom"}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => setColor(p.hex)}
                aria-label={p.name}
                title={p.name}
                className={cn(
                  "size-9 rounded-full ring-1 ring-border transition-shadow",
                  color === p.hex && "ring-2 ring-offset-2 ring-brand"
                )}
                style={{ background: p.hex }}
              />
            ))}
            <label
              htmlFor="trim-color"
              className="grid size-9 cursor-pointer place-items-center rounded-full border border-dashed text-muted-foreground"
              title="Custom color"
            >
              <input
                id="trim-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-0 opacity-0"
              />
              +
            </label>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold text-brand">2. Choose sizes (min. order {MIN_ORDER})</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SIZES.map((s) => (
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
            <div className="font-semibold text-brand">₹{UNIT_PRICE} per piece</div>
          </div>
          <button
            type="button"
            onClick={addToBasket}
            className="h-11 shrink-0 rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:bg-brand/90"
          >
            Add to basket ({totalQty})
          </button>
        </div>
      </div>
    </div>
  );
}

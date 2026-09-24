"use client";

import { useEffect, useRef, useState } from "react";
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Live collar/sleeve trim recolor: the trim's own grayscale luminance (from
 * polo-trim-mask.png, see scripts/make-collar-mask.mjs) is overlay-blended with the
 * picked color on a 2D canvas — same technique as the Studio's live recolor shader —
 * then composited back only where the mask has coverage, so shading/folds stay intact. */
export function MockupLiveCustomizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<{ base: HTMLImageElement; mask: HTMLImageElement } | null>(null);
  const [color, setColor] = useState(PRESETS[0].hex);
  const [ready, setReady] = useState(false);

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

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h2 className="text-2xl font-semibold text-brand">Essential Polo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a collar trim color. Sleeve trim colors and different trim patterns are coming next.
        </p>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collar color — {activePreset?.name ?? "Custom"}
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
                  "size-10 rounded-full ring-1 ring-border transition-shadow",
                  color === p.hex && "ring-2 ring-offset-2 ring-brand"
                )}
                style={{ background: p.hex }}
              />
            ))}
            <label
              htmlFor="trim-color"
              className="grid size-10 cursor-pointer place-items-center rounded-full border border-dashed text-muted-foreground"
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
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl bg-muted">
        <canvas ref={canvasRef} className="size-full object-contain" />
      </div>
    </div>
  );
}

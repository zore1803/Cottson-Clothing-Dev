"use client";

import { useEffect, useRef, useState } from "react";

const BASE = "/mockup/polo-green.png";
const MASK = "/mockup/polo-trim-mask.png";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Same overlay blend as the Studio's live recolor shader, done on a plain 2D canvas:
 * the trim's own grayscale luminance (from the mask) is overlay-blended with the picked
 * color, then composited back only where the mask has coverage — so shading/folds in the
 * original photo are preserved instead of flattening the stripe to one flat color. */
export function MockupLiveCustomizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<{ base: HTMLImageElement; mask: HTMLImageElement } | null>(null);
  const [color, setColor] = useState("#7ac142");
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

    // Build the overlay-blended color layer, then clip it to the mask's own alpha
    const layer = document.createElement("canvas");
    layer.width = W;
    layer.height = H;
    const lctx = layer.getContext("2d")!;

    lctx.drawImage(mask, 0, 0); // grayscale luminance
    lctx.globalCompositeOperation = "overlay";
    const [r, g, b] = hexToRgb(color);
    lctx.fillStyle = `rgb(${r},${g},${b})`;
    lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(mask, 0, 0); // clip back to just the trim's alpha

    ctx.drawImage(layer, 0, 0);
  }, [color, ready]);

  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl bg-muted">
        <canvas ref={canvasRef} className="size-full object-contain" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="trim-color">
          Live trim color
        </label>
        <input
          id="trim-color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="size-10 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
      </div>
    </div>
  );
}

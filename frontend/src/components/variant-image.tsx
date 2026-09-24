"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { variantUrl, type GarmentMeta, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export type VariantHandle = {
  /** The currently shown color as a canvas, for export and cart previews */
  getCanvas: () => HTMLCanvasElement | null;
};

type Props = {
  product: Product;
  colorId: string;
  className?: string;
  onReady?: (meta: GarmentMeta) => void;
};

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Bounding box of the garment's non-transparent pixels (for the studio's print-area
 * placement). Same for every color of a product, so it's scanned once per product. */
function scanBbox(img: HTMLImageElement): [number, number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const a = data[(y * img.width + x) * 4 + 3];
      if (a > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 > x0 ? [x0, y0, x1, y1] : [0, 0, img.width, img.height];
}

type Layer = { url: string; key: number; img: HTMLImageElement; visible: boolean };

/** Garment color as a swapped, pre-rendered photo per color (public/products/<slug>/variants,
 * see scripts/render-variants.mjs) instead of a live per-pixel recolor — the same "swap the
 * whole image" approach gomula's design studio uses. The old image is kept mounted and
 * cross-faded out under the new one so the swap reads as a transition, not a pop. */
export const VariantImage = forwardRef<VariantHandle, Props>(function VariantImage(
  { product, colorId, className, onReady },
  ref
) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(true);
  const metaRef = useRef<GarmentMeta | null>(null);
  const keyRef = useRef(0);

  useImperativeHandle(ref, () => ({
    getCanvas: () => {
      const meta = metaRef.current;
      const top = layers[layers.length - 1];
      if (!meta || !top) return null;
      const c = document.createElement("canvas");
      c.width = meta.width;
      c.height = meta.height;
      c.getContext("2d")!.drawImage(top.img, 0, 0, meta.width, meta.height);
      return c;
    },
  }));

  // Bounding box only depends on the garment's shape, not its color — scan once per product
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const garmentImg = await loadImage(`/products/${product.slug}/garment-layer.png`);
      if (cancelled) return;
      const meta: GarmentMeta = { width: garmentImg.width, height: garmentImg.height, bbox: scanBbox(garmentImg) };
      metaRef.current = meta;
      onReady?.(meta);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  // Crossfade to the new color: load it fully off-screen, then fade it in over the old one
  useEffect(() => {
    let cancelled = false;
    setLoading(layers.length === 0);
    const url = variantUrl(product, colorId);
    loadImage(url).then((img) => {
      if (cancelled) return;
      const key = ++keyRef.current;
      setLayers((prev) => [...prev, { url, key, img, visible: false }]);
      setLoading(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (cancelled) return;
          setLayers((prev) => prev.map((l) => (l.key === key ? { ...l, visible: true } : l)));
        })
      );
      // drop earlier layers once the fade has finished
      window.setTimeout(() => {
        if (cancelled) return;
        setLayers((prev) => prev.filter((l) => l.key === key));
      }, 320);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug, colorId]);

  const meta = metaRef.current;
  return (
    <div
      className={cn("relative w-full overflow-hidden bg-muted", className)}
      style={{ aspectRatio: meta ? `${meta.width} / ${meta.height}` : "3 / 4" }}
    >
      {layers.map((l, i) => (
        <img
          key={l.key}
          src={l.url}
          alt={product.title}
          className="absolute inset-0 size-full object-cover transition-opacity duration-300 ease-out"
          style={{ opacity: l.visible ? 1 : 0, zIndex: i }}
        />
      ))}
      {loading && layers.length === 0 && <div className="absolute inset-0 animate-pulse bg-muted" />}
    </div>
  );
});

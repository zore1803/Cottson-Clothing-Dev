"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Application, Mesh, Shader } from "pixi.js";
import { RECOLOR_FRAGMENT, RECOLOR_VERTEX } from "@/lib/recolor-shader";
import { type GarmentMeta } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export type RecolorHandle = {
  /** The canvas with the current recolored image, for export and cart previews */
  getCanvas: () => HTMLCanvasElement | null;
  size: () => { width: number; height: number } | null;
};

type Props = {
  slug: string;
  /** hex, or null to keep the photo's own original color */
  topColor: string | null;
  className?: string;
  onReady?: (meta: GarmentMeta) => void;
};

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Bounding box of the garment's non-transparent pixels (for the studio's print-area
 * placement), and the garment's own average brightness (for the recolor shader's
 * light-target dampening — see uSourceLum in recolor-shader.ts). */
function scanGarment(img: HTMLImageElement): { bbox: [number, number, number, number]; avgLum: number } {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  let lumSum = 0, count = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (data[i + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        lumSum += data[i];
        count++;
      }
    }
  }
  return {
    bbox: x1 > x0 ? [x0, y0, x1, y1] : [0, 0, img.width, img.height],
    avgLum: count > 0 ? lumSum / count / 255 : 0.5,
  };
}

/** Live garment recolor: a grayscale "garment-layer" PNG, overlay-blended and stacked on
 * the untouched product photo. Changing a color is one uniform update + one render. */
export const RecolorCanvas = forwardRef<RecolorHandle, Props>(function RecolorCanvas(
  { slug, topColor, className, onReady },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const shaderRef = useRef<Shader | null>(null);
  const garmentMeshRef = useRef<Mesh | null>(null);
  const metaRef = useRef<GarmentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => {
      appRef.current?.render();
      return (appRef.current?.canvas as HTMLCanvasElement) ?? null;
    },
    size: () => (metaRef.current ? { width: metaRef.current.width, height: metaRef.current.height } : null),
  }));

  // Build the Pixi scene once per product
  useEffect(() => {
    let cancelled = false;
    let app: Application | null = null;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const PIXI = await import("pixi.js");
        const [modelImg, garmentImg] = await Promise.all([
          loadImage(`/products/${slug}/model-photo.png`),
          loadImage(`/products/${slug}/garment-layer.png`),
        ]);
        if (cancelled) return;
        const W = modelImg.width, H = modelImg.height;
        const { bbox, avgLum } = scanGarment(garmentImg);
        const meta: GarmentMeta = { width: W, height: H, bbox };

        app = new PIXI.Application();
        await app.init({
          width: W,
          height: H,
          preference: "webgl",
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          autoStart: false, // render on demand only
          preserveDrawingBuffer: true, // lets us export the canvas
        });
        if (cancelled) {
          app.destroy(true, { children: true, texture: true });
          return;
        }

        // Static base: the full photo (model, skin, background) — never recolored
        const modelSprite = new PIXI.Sprite(PIXI.Texture.from(modelImg));
        modelSprite.width = W;
        modelSprite.height = H;

        // Garment-only layer, pixel-aligned with the photo above, overlay-blended live
        const geometry = new PIXI.Geometry({
          attributes: { aPosition: [0, 0, W, 0, W, H, 0, H], aUV: [0, 0, 1, 0, 1, 1, 0, 1] },
          indexBuffer: [0, 1, 2, 0, 2, 3],
        });
        const shader = PIXI.Shader.from({
          gl: { vertex: RECOLOR_VERTEX, fragment: RECOLOR_FRAGMENT },
          resources: {
            uGarment: PIXI.Texture.from(garmentImg).source,
            recolor: {
              uColor: { value: new Float32Array(3), type: "vec3<f32>" },
              uSourceLum: { value: avgLum, type: "f32" },
            },
          },
        });
        const garmentMesh = new PIXI.Mesh({ geometry, shader }) as Mesh;

        app.stage.addChild(modelSprite, garmentMesh);

        const canvas = app.canvas as HTMLCanvasElement;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        hostRef.current?.replaceChildren(canvas);

        appRef.current = app;
        shaderRef.current = shader;
        garmentMeshRef.current = garmentMesh;
        metaRef.current = meta;
        setLoading(false);
        onReady?.(meta);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load the product image.");
      }
    })();

    return () => {
      cancelled = true;
      appRef.current = null;
      shaderRef.current = null;
      garmentMeshRef.current = null;
      if (app) app.destroy(true, { children: true, texture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Color changes: update the uniform (or hide the overlay for the original color) and draw one frame
  useEffect(() => {
    const shader = shaderRef.current;
    const mesh = garmentMeshRef.current;
    const app = appRef.current;
    if (!shader || !mesh || !app) return;
    mesh.visible = topColor !== null;
    if (topColor !== null) {
      shader.resources.recolor.uniforms.uColor.set(hexToRgb(topColor));
    }
    app.render();
  }, [topColor, loading]);

  const meta = metaRef.current;
  return (
    <div
      className={cn("relative w-full overflow-hidden bg-muted", className)}
      style={{ aspectRatio: meta ? `${meta.width} / ${meta.height}` : "3 / 4" }}
    >
      <div ref={hostRef} className="h-full w-full" />
      {loading && !error && <div className="absolute inset-0 animate-pulse bg-muted" />}
      {error && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{error}</div>}
    </div>
  );
});

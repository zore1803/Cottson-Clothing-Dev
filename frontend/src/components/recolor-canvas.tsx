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

const srgbToLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const fwdLab = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [R, G, B] = [r, g, b].map(srgbToLinear);
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const fx = fwdLab(X), fy = fwdLab(Y), fz = fwdLab(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Target color's Lab L, a, b (D65) — the live shader re-centers the source pixel's own L
 * on this L and replaces a/b, see RECOLOR_FRAGMENT in recolor-shader.ts. */
const hexToLab = (h: string) =>
  rgbToLab(...([1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]));

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Bounding box of the garment's non-transparent pixels (for the studio's print-area
 * placement), and the garment's own average Lab L (for the live shader's uSourceAvgL — see
 * RECOLOR_FRAGMENT in recolor-shader.ts). */
function scanGarment(baseImg: HTMLImageElement, garmentImg: HTMLImageElement): { bbox: [number, number, number, number]; avgL: number } {
  const { width, height } = garmentImg;
  const garmentCanvas = document.createElement("canvas");
  garmentCanvas.width = width;
  garmentCanvas.height = height;
  const garmentCtx = garmentCanvas.getContext("2d")!;
  garmentCtx.drawImage(garmentImg, 0, 0);
  const mask = garmentCtx.getImageData(0, 0, width, height).data;

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext("2d")!;
  baseCtx.drawImage(baseImg, 0, 0, width, height);
  const base = baseCtx.getImageData(0, 0, width, height).data;

  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  let lSum = 0, lCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (mask[i + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      if (mask[i + 3] > 128) {
        lSum += rgbToLab(base[i] / 255, base[i + 1] / 255, base[i + 2] / 255)[0];
        lCount++;
      }
    }
  }
  return {
    bbox: x1 > x0 ? [x0, y0, x1, y1] : [0, 0, width, height],
    avgL: lCount > 0 ? lSum / lCount : 50,
  };
}

/** Live garment recolor: a feathered-alpha "garment-layer" mask, Lab color-swapped live
 * against the untouched product photo. Changing a color is one uniform update + one render. */
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
        const { bbox, avgL } = scanGarment(modelImg, garmentImg);
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
            uBase: PIXI.Texture.from(modelImg).source,
            uGarment: PIXI.Texture.from(garmentImg).source,
            recolor: {
              uTargetLab: { value: new Float32Array(3), type: "vec3<f32>" },
              uSourceAvgL: { value: avgL, type: "f32" },
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
      shader.resources.recolor.uniforms.uTargetLab.set(hexToLab(topColor));
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

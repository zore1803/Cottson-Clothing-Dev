"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Application, Mesh, Shader } from "pixi.js";
import { RECOLOR_FRAGMENT, RECOLOR_VERTEX } from "@/lib/recolor-shader";
import { assetUrl, type PartStats, type ProductMeta } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export type RecolorHandle = {
  /** The canvas with the current recolored image, for export and cart previews */
  getCanvas: () => HTMLCanvasElement | null;
  size: () => { width: number; height: number } | null;
};

type Props = {
  slug: string;
  /** hex, or null to keep the photo's own color */
  topColor: string | null;
  pantsColor?: string | null;
  className?: string;
  onReady?: (meta: ProductMeta) => void;
};

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const statsVec = (s: PartStats | null) => (s ? [s.avg, s.exp, s.peak, s.dark ? 1 : 0] : [1, 1, 1, 0]);

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Live garment recolor: PixiJS mesh + custom shader. Changing a color is one uniform update + one render. */
export const RecolorCanvas = forwardRef<RecolorHandle, Props>(function RecolorCanvas(
  { slug, topColor, pantsColor = null, className, onReady },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const shaderRef = useRef<Shader | null>(null);
  const metaRef = useRef<ProductMeta | null>(null);
  // undefined = nothing drawn yet (first paint never animates)
  const prevTopRef = useRef<string | null | undefined>(undefined);
  const animRef = useRef<number | null>(null);
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
        const [meta, photo, maskImg] = await Promise.all([
          fetch(assetUrl(slug, "meta.json")).then((r) => r.json() as Promise<ProductMeta>),
          loadImage(assetUrl(slug, "photo.jpg")),
          loadImage(assetUrl(slug, "mask.png")),
        ]);
        if (cancelled) return;
        const { width: W, height: H } = meta;

        // Feather mask edges slightly so garment borders blend into the photo
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = W;
        maskCanvas.height = H;
        const mctx = maskCanvas.getContext("2d")!;
        mctx.filter = "blur(0.8px)";
        mctx.drawImage(maskImg, 0, 0, W, H);

        app = new PIXI.Application();
        await app.init({
          width: W,
          height: H,
          preference: "webgl",
          backgroundAlpha: 0,
          antialias: false,
          autoStart: false, // render on demand only
          preserveDrawingBuffer: true, // lets us export the canvas
        });
        if (cancelled) {
          app.destroy(true, { children: true, texture: true });
          return;
        }

        const photoTex = PIXI.Texture.from(photo);
        const maskTex = PIXI.Texture.from(maskCanvas);
        const geometry = new PIXI.Geometry({
          attributes: { aPosition: [0, 0, W, 0, W, H, 0, H], aUV: [0, 0, 1, 0, 1, 1, 0, 1] },
          indexBuffer: [0, 1, 2, 0, 2, 3],
        });
        const shader = PIXI.Shader.from({
          gl: { vertex: RECOLOR_VERTEX, fragment: RECOLOR_FRAGMENT },
          resources: {
            uPhoto: photoTex.source,
            uMask: maskTex.source,
            recolor: {
              uTopColor: { value: new Float32Array(3), type: "vec3<f32>" },
              uPantsColor: { value: new Float32Array(3), type: "vec3<f32>" },
              uTopStats: { value: new Float32Array(statsVec(meta.parts.top)), type: "vec4<f32>" },
              uPantsStats: { value: new Float32Array(statsVec(meta.parts.pants)), type: "vec4<f32>" },
              uOn: { value: new Float32Array(2), type: "vec2<f32>" },
              uTexel: { value: new Float32Array([1 / W, 1 / H]), type: "vec2<f32>" },
              uTopFrom: { value: new Float32Array(3), type: "vec3<f32>" },
              uFromOn: { value: 0, type: "f32" },
              uProgress: { value: 1, type: "f32" },
            },
          },
        });
        const mesh = new PIXI.Mesh({ geometry, shader }) as Mesh;
        app.stage.addChild(mesh);

        const canvas = app.canvas as HTMLCanvasElement;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        hostRef.current?.replaceChildren(canvas);

        appRef.current = app;
        shaderRef.current = shader;
        metaRef.current = meta;
        setLoading(false);
        prevTopRef.current = undefined;
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
      if (app) app.destroy(true, { children: true, texture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Color changes: update uniforms, then play the flowing blue transition (~700 ms)
  useEffect(() => {
    const shader = shaderRef.current;
    const app = appRef.current;
    if (!shader || !app) return;
    const u = shader.resources.recolor.uniforms;
    const meta = metaRef.current!;
    const prev = prevTopRef.current;
    const firstPaint = prev === undefined;
    const topChanged = !firstPaint && prev !== topColor;
    prevTopRef.current = topColor;

    u.uTopColor.set(hexToRgb(topColor ?? "#000000"));
    u.uPantsColor.set(hexToRgb(pantsColor ?? "#000000"));
    u.uOn[0] = topColor && meta.parts.top ? 1 : 0;
    u.uOn[1] = pantsColor && meta.parts.pants ? 1 : 0;

    if (animRef.current) cancelAnimationFrame(animRef.current);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // No animation on first paint, for trouser-only changes, or when the user prefers less motion
    if (!topChanged || loading || reduceMotion || !meta.parts.top) {
      u.uProgress = 1;
      app.render();
      return;
    }
    u.uTopFrom.set(hexToRgb(prev ?? "#000000"));
    u.uFromOn = prev ? 1 : 0;
    const start = performance.now();
    const DURATION = 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      u.uProgress = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
      app.render();
      animRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [topColor, pantsColor, loading]);

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

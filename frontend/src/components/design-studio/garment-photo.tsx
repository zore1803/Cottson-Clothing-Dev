"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { type Product, assetUrl, colorById, variantUrl } from "@/lib/catalog";
import { IMAGE_ASPECT, type Focus } from "./placement";

/** Pan + zoom (transform-origin 0 0) that puts the focus point in the middle of the frame.
 * The photo box is as tall as the frame and centred in it, so everything works in fractions
 * of the photo box; the pan is clamped so the photo never slides off an edge. */
function focusTransform({ px, py, z }: Focus) {
  const A = IMAGE_ASPECT;
  let tx = 0.5 - z * px;
  // Photo edges relative to the frame: left = (1 - A) / 2 + tx·A, right = left + z·A
  if (z * A >= 1) tx = Math.min(-(1 - A) / (2 * A), Math.max((1 + A) / (2 * A) - z, tx));
  else tx = (1 - z) / 2;
  const ty = Math.min(0, Math.max(1 - z, 0.5 - z * py));
  return `translate(${tx * 100}%, ${ty * 100}%) scale(${z})`;
}

// Only pose 0 has pre-rendered color variants (see scripts/render-variants.mjs, which only
// ever wrote to the product root, i.e. pose 0's assets) — other poses are reference angles
// shown in the garment's original photographed color. A key of "pose-<n>" (n > 0) picks that
// pose's own photo; any other key is a colorId shown via pose 0's color-swap variant.
const poseKey = (pose: number) => `pose-${pose}`;
const isPoseKey = (key: string) => key.startsWith("pose-");

/** The polo photo in its own 2:3 box (so cm placement maps 1:1 to the image), with the
 * wave-sweep transition between collar colors (pose 0) or between reference angles (other
 * poses). Children (the logo layer) sit on top. */
export const GarmentPhoto = forwardRef<
  HTMLDivElement,
  { product: Product; colorId: string; pose?: number; focus?: Focus | null; children?: React.ReactNode }
>(
  function GarmentPhoto({ product, colorId, pose = 0, focus, children }, ref) {
    const key = pose === 0 ? colorId : poseKey(pose);
    const [base, setBase] = useState(key);
    const [incoming, setIncoming] = useState<string | null>(null);
    const [swept, setSwept] = useState(false);
    const [shown, setShown] = useState(key);

    // A new color or pose starts a sweep: the new photo is revealed left→right over the old one
    if (key !== shown) {
      setShown(key);
      setIncoming(key);
      setSwept(false);
    }
    useEffect(() => {
      if (!incoming) return;
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setSwept(true)));
      const t = window.setTimeout(() => {
        setBase(incoming);
        setIncoming(null);
        setSwept(false);
      }, 650);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }, [incoming]);

    const img = (k: string) => (
      <Image
        src={isPoseKey(k) ? assetUrl(product.slug, "model-photo.png", Number(k.slice(5))) : variantUrl(product, k)}
        alt={isPoseKey(k) ? `${product.title} — alternate angle` : `${product.title} — ${colorById(k).name}`}
        fill
        // Served as-is: the optimizer re-encodes at q75, which shows when zoomed in
        unoptimized
        draggable={false}
        className="pointer-events-none object-cover"
        priority
      />
    );

    return (
      <div
        ref={ref}
        className="relative h-full select-none transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{ aspectRatio: IMAGE_ASPECT, transformOrigin: "0 0", transform: focus ? focusTransform(focus) : undefined }}
      >
        {img(base)}
        {incoming && (
          <div
            className="absolute inset-0 transition-[clip-path] duration-[650ms] ease-in-out"
            style={{ clipPath: `inset(0 ${swept ? "0%" : "100%"} 0 0)` }}
          >
            {img(incoming)}
          </div>
        )}
        {incoming && (
          <div
            className="pointer-events-none absolute inset-y-0 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent blur-md transition-[left] duration-[650ms] ease-in-out"
            style={{ left: swept ? "100%" : "0%" }}
          />
        )}
        {children}
      </div>
    );
  }
);

/** Average color of the garment photo around a point (fractions of width/height) */
export function useFabricColor(src: string, fx: number, fy: number) {
  const [color, setColor] = useState("#1a1a1a");
  const imgRef = useRef<{ src: string; data: ImageData } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const sample = (data: ImageData) => {
      const cx = Math.round(fx * data.width), cy = Math.round(fy * data.height);
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = cy - 6; y <= cy + 6; y++)
        for (let x = cx - 6; x <= cx + 6; x++) {
          if (x < 0 || y < 0 || x >= data.width || y >= data.height) continue;
          const i = (y * data.width + x) * 4;
          r += data.data[i];
          g += data.data[i + 1];
          b += data.data[i + 2];
          n++;
        }
      if (n && !cancelled) setColor(`rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`);
    };
    if (imgRef.current?.src === src) {
      sample(imgRef.current.data);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 200;
      c.height = Math.round((200 * img.naturalHeight) / img.naturalWidth);
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      imgRef.current = { src, data };
      sample(data);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, fx, fy]);
  return color;
}

export type Weave = "pique" | "poplin" | "jersey";
/** The knit / weave to draw for a product in the close-up */
export const weaveFor = (category: string): Weave =>
  /shirt/i.test(category) && !/t-?shirt|sweat/i.test(category) ? "poplin" : /polo/i.test(category) ? "pique" : "jersey";

// Surface texture per weave, lit from the top-left, as CSS backgrounds (sharp at any size)
const WEAVES: Record<Weave, { image: string; size: string; position: string }> = {
  // Pique knit: two offset grids of tiny raised cells
  pique: {
    image:
      "radial-gradient(ellipse 45% 40% at 40% 38%, rgba(255,255,255,0.09), transparent 70%), radial-gradient(ellipse 45% 40% at 40% 38%, rgba(255,255,255,0.07), transparent 70%), linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px)",
    size: "6px 5px, 6px 5px, 3px 100%",
    position: "0 0, 3px 2.5px, 0 0",
  },
  // Poplin: a fine, tight plain weave — faint crossing threads
  poplin: {
    image:
      "linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.07) 1px, transparent 1px)",
    size: "3px 3px, 3px 3px",
    position: "0 0, 1px 1px",
  },
  // Jersey: columns of small V-shaped loops
  jersey: {
    image:
      "linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px, rgba(255,255,255,0.06) 3px, transparent 4px), linear-gradient(0deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
    size: "5px 100%, 100% 4px",
    position: "0 0, 0 0",
  },
};

export type Stripes = { vertical: boolean; periodCm: number; light: boolean; duty: number };

/** Macro shot of the logo on the fabric: the garment's own color with its weave (and stripes,
 * if it has them), drawn sharp at any size — magnifying the product photo instead only shows
 * blurry pixels. */
export function FabricCloseup({
  fabric,
  logo,
  aspect,
  rotation,
  embroidered,
  weave = "pique",
  stripes,
  logoWidthCm,
}: {
  fabric: string;
  logo: string;
  aspect: number;
  rotation: number;
  embroidered: boolean;
  weave?: Weave;
  /** Stripes measured on the photo; drawn to scale against the logo (needs logoWidthCm) */
  stripes?: Stripes | null;
  logoWidthCm?: number;
}) {
  // Fill most of the frame, like a macro photo of the stitching
  const w = aspect >= 1 ? 88 : 80 * aspect;
  const t = WEAVES[weave];
  // Stripe spacing as a share of the view: the logo is w% of the view and logoWidthCm wide
  const stripePct = stripes && logoWidthCm ? (stripes.periodCm / (logoWidthCm / (w / 100))) * 100 : null;
  // The photo's average color mixes ground and stripes; lines are pushed toward white / black
  const line = stripes?.light ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.35)";
  return (
    <div className="relative size-full overflow-hidden" style={{ background: fabric }}>
      {stripes && stripePct && (
        <div
          className="absolute inset-0"
          style={{
            // Ground slightly darker (light lines) or lighter (dark lines) than the average color
            backgroundColor: stripes.light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.1)",
            backgroundImage: `linear-gradient(${stripes.vertical ? "90deg" : "0deg"}, ${line} 0 ${stripes.duty * 100}%, transparent ${stripes.duty * 100}% 100%)`,
            // (the close-up box is square, so one percentage works for either direction)
            backgroundSize: stripes.vertical ? `${stripePct}% 100%` : `100% ${stripePct}%`,
          }}
        />
      )}
      <div className="absolute inset-0" style={{ backgroundImage: t.image, backgroundSize: t.size, backgroundPosition: t.position }} />
      {/* Soft falloff like a real close-up photo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.35))]" />
      <div className="absolute inset-0 grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
        <img
          src={logo}
          alt="Logo close-up"
          draggable={false}
          className="pointer-events-none select-none"
          style={{
            width: `${w}%`,
            transform: `rotate(${rotation}deg)`,
            // Printed ink lets a little of the knit show through; thread covers it completely and
            // stands on the fabric, so it casts a small shadow at macro scale
            filter: embroidered ? "drop-shadow(1px 2px 2px rgba(0,0,0,0.45))" : "contrast(0.96) saturate(0.95)",
            opacity: embroidered ? 1 : 0.9,
          }}
        />
      </div>
    </div>
  );
}

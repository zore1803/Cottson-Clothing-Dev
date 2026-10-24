"use client";

// Zoomed fabric close-ups of the polo, recoloured live to the garment's body colour.
// Layers live in public/mockups/fabric/. Two variants:
//   "branded": the cloth with the Cottson Clothing embroidery
//     1. a flat colour fill, clipped by the mask so it only paints where there is cloth
//     2. the shade layer multiplied on top (weave, shadows, the pile pressed down by the stitching)
//     3. the embroidery
//   "blank": plain cloth, no branding: the colour fill with a separate blank shade multiplied on top.
//     When the customer has uploaded a logo it is stitched (or printed) onto this cloth, at close-up
//     detail, by lib/mockup/embroidery.ts. The mannequin preview is not involved.
// Same idea as the garment mockups, so the cloth always matches the polo's colour.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { COLORS } from "@/lib/catalog";
import { renderCloseup, type CloseupFinish } from "@/lib/mockup/embroidery";

const BASE = "/mockups/fabric";
const mask = `url(${BASE}/polo-mask.webp)`;
const SIZE = 1024; // the fabric photos are 1024 × 1024
/** The weave runs at about this angle in the photo; the logo is turned to follow it */
const WEAVE_ANGLE = 20;
/** The logo fills about this much of the frame, so its stitching is large enough to see (whatever the size slider says) */
const LOGO_FRAME = 0.65;

// Black cloth swallows the multiplied shade (it comes out flat), so the branded close-up uses a real photo of black piqué instead
const BLACK = COLORS.find((c) => c.id === "black")?.hex.toLowerCase();

/** Relative luminance, 0 (black) to 1 (white) */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Below this luminance a plain multiply loses the weave, so the blank cloth switches to a higher-contrast shade */
const DARK = 0.1;

export type FabricVariant = "branded" | "blank";
/** The customer's logo: a data/blob URL and the finish they chose */
export type CloseupLogo = { src: string; finish: CloseupFinish };

// ---- inputs for the renderer, loaded once ----------------------------------------------

let fabricLuma: Promise<Float32Array> | null = null;
/** The blank fabric photo as luminance: gives the stitching the cloth's folds and weave */
function loadFabricLuma() {
  fabricLuma ??= (async () => {
    const img = new Image();
    img.src = `${BASE}/polo-blank-shade.webp`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const out = new Float32Array(SIZE * SIZE);
    for (let i = 0; i < out.length; i++) out[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    return out;
  })().catch((e) => {
    fabricLuma = null;
    throw e;
  });
  return fabricLuma;
}

/** The logo's pixels. Longest side ≤ 1600 px; vector logos are drawn large so edges stay sharp. */
async function logoPixels(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const vector = src.startsWith("data:image/svg") || /\.svg($|\?)/i.test(src);
  const nw = img.naturalWidth || 512, nh = img.naturalHeight || 512;
  const k = vector ? 1400 / Math.max(nw, nh) : Math.min(1, 1600 / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

// The last few renders, so flipping back to the close-up is instant
const rendered = new Map<string, Uint8ClampedArray>();
const keyOf = (l: CloseupLogo, brightness: number) => `${l.src.length}:${l.src.slice(-40)}|${l.finish}|${brightness}`;

export function FabricDetail({ colour, variant = "branded", logo, className }: { colour: string; variant?: FabricVariant; logo?: CloseupLogo | null; className?: string }) {
  const blank = variant === "blank";
  const photo = !blank && colour.toLowerCase() === BLACK;
  // 0 for light colours, up to ~1 for black: how much of the higher-contrast shade to bring in
  const dark = Math.max(0, Math.min(1, (DARK - luminance(colour)) / DARK));

  // Thread a touch dimmer on dark cloth, so it sits in the cloth and does not glow
  const threadBrightness = dark > 0 ? 0.9 : 1;
  const customerLogo = blank && logo ? logo : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const logoSrc = customerLogo?.src, logoFinish = customerLogo?.finish;
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || logoSrc === undefined || logoFinish === undefined) return;
    const l: CloseupLogo = { src: logoSrc, finish: logoFinish };
    const key = keyOf(l, threadBrightness);
    const draw = (rgba: Uint8ClampedArray) => cv.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), SIZE, SIZE), 0, 0);
    const cached = rendered.get(key);
    if (cached) {
      draw(cached);
      return;
    }
    let cancelled = false;
    // Wait for the slider to settle: a render takes about half a second
    const t = window.setTimeout(async () => {
      setBusy(true);
      try {
        const [fabric, px] = await Promise.all([loadFabricLuma(), logoPixels(l.src)]);
        if (cancelled) return;
        await new Promise((r) => requestAnimationFrame(() => r(null))); // let the "stitching" note paint first
        if (cancelled) return;
        const res = renderCloseup(px.data, px.w, px.h, { size: SIZE, boxW: SIZE * LOGO_FRAME, boxH: SIZE * LOGO_FRAME, angleDeg: WEAVE_ANGLE, finish: l.finish, brightness: threadBrightness, fabric });
        if (cancelled) return;
        rendered.set(key, res.rgba);
        if (rendered.size > 4) rendered.delete(rendered.keys().next().value!);
        draw(res.rgba);
      } catch {
        // an unreadable image: leave the plain cloth
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [logoSrc, logoFinish, threadBrightness]);

  const caption = blank
    ? customerLogo
      ? customerLogo.finish === "print" ? "Your logo, printed" : "Your logo, embroidered"
      : "Plain fabric"
    : "Fabric with embroidery";
  const label = blank
    ? customerLogo
      ? `Close-up of the polo fabric with your logo ${customerLogo.finish === "print" ? "printed" : "embroidered"} on it`
      : "Close-up of the polo fabric"
    : "Close-up of the polo fabric with the Cottson Clothing embroidery";

  return (
    <figure className={className}>
      <div role="img" aria-label={label} className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" style={{ isolation: "isolate" }}>
        {blank ? (
          <>
            <div className="absolute inset-0 transition-colors duration-200" style={{ backgroundColor: colour }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/${dark > 0 ? "polo-blank-shade-dark" : "polo-blank-shade"}.webp`} alt="" draggable={false} className="absolute inset-0 size-full mix-blend-multiply" />
            {dark > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${BASE}/polo-blank-shade-dark.webp`} alt="" draggable={false} className="absolute inset-0 size-full mix-blend-soft-light" style={{ opacity: dark * 0.9 }} />
            )}
            {customerLogo && <canvas ref={canvasRef} width={SIZE} height={SIZE} aria-hidden className="absolute inset-0 size-full" />}
            {busy && (
              <div role="status" className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-brand shadow-sm">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {customerLogo?.finish === "print" ? "Printing your logo…" : "Stitching your logo…"}
              </div>
            )}
          </>
        ) : photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${BASE}/polo-black.webp`} alt="" draggable={false} className="absolute inset-0 size-full" />
        ) : (
          <>
            <div
              className="absolute inset-0 transition-colors duration-200"
              style={{ backgroundColor: colour, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: "cover", maskSize: "cover", WebkitMaskPosition: "center", maskPosition: "center" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/polo-shade.webp`} alt="" draggable={false} className="absolute inset-0 size-full mix-blend-multiply" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/polo-embroidery.webp`} alt="" draggable={false} className="absolute inset-0 size-full" />
          </>
        )}
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{caption} · follows your body colour</figcaption>
    </figure>
  );
}

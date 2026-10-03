"use client";

import { useEffect, useState } from "react";
import { checkStitchability, logoPalette, recolorLogo, renderEmbroidery } from "@/lib/embroidery";

export type LogoFile = { src: string; name: string; aspect: number; palette: string[] };

/** Read an uploaded logo: data URL, aspect ratio (w / h) and its main colors */
export async function readLogoFile(file: File): Promise<LogoFile> {
  const src = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  // onload rather than img.decode(): decode() waits for the tab to render, so it stalls in background tabs
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  // SVGs without intrinsic size report 0; fall back to square
  const aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
  const palette = await logoPalette(src).catch(() => []);
  return { src, name: file.name, aspect, palette };
}

/** The artwork to show for the logo: rendered stitches for embroidery, or the flat logo for
 * print (recolored when a single color is chosen). Re-rendered, debounced, when the settings
 * or the logo's real size change, since stitch density depends on size. */
export function useLogoArt(
  src: string | null,
  opts: { embroidered: boolean; maxColors: number; color: string | null; widthCm: number; thickenMm?: number; angleDeg?: number }
) {
  const [art, setArt] = useState<{ key: string; url: string; src: string; embroidered: boolean } | null>(null);
  const { embroidered, maxColors, color } = opts;
  // Round the size so dragging a corner doesn't re-stitch on every pixel
  const widthCm = embroidered ? Math.round(opts.widthCm) : 0;
  const thickenMm = embroidered ? Math.round((opts.thickenMm ?? 0) * 10) / 10 : 0;
  const angleDeg = opts.angleDeg ?? 45;
  const needsRender = !!src && (embroidered || !!color);
  const key = `${src?.length}:${src?.slice(-32)}:${embroidered}:${maxColors}:${color}:${widthCm}:${thickenMm}:${angleDeg}`;

  useEffect(() => {
    if (!needsRender || !src) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      (embroidered
        ? renderEmbroidery(src, { maxColors, thread: color, widthCm, thickenMm, angleDeg, width: 1000 })
        : recolorLogo(src, color!)
      )
        .then((url) => !cancelled && setArt({ key, url, src, embroidered }))
        .catch(() => {});
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [needsRender, src, embroidered, maxColors, color, widthCm, thickenMm, angleDeg, key]);

  if (!src) return { url: null, pending: false };
  if (!needsRender) return { url: src, pending: false };
  // Keep showing the previous render of the same kind (or the plain logo) while a new one is made
  return { url: art && art.src === src && art.embroidered === embroidered ? art.url : src, pending: art?.key !== key };
}

/** Measures the logo's thin strokes at its current size, to warn when they're too fine to
 * embroider cleanly (and say how much thickening they need). Embroidery only — print has no
 * minimum stroke width. */
export function useStitchability(src: string | null, embroidered: boolean, widthCm: number) {
  const [result, setResult] = useState<{ key: string; tooFine: boolean; minStrokeMm: number } | null>(null);
  const w = Math.round(widthCm);
  const key = `${src?.length}:${src?.slice(-32)}:${w}`;
  useEffect(() => {
    if (!src || !embroidered) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      checkStitchability(src, w)
        .then((r) => !cancelled && setResult({ key, ...r }))
        .catch(() => {});
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [src, embroidered, w, key]);
  // A result only counts for the logo + size it was measured at
  const current = embroidered && result?.key === key ? result : null;
  return { tooFine: current?.tooFine ?? false, minStrokeMm: current?.minStrokeMm ?? 0 };
}

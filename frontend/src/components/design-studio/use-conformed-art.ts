"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FOLD_WARP_PX,
  PATTERN_MIN,
  conform,
  fabricPatch,
  fabricStats,
  toGray,
  type Box,
  type FabricPatch,
  type Gray,
  type PhotoGeometry,
} from "@/lib/conform";
import { IMAGE_ASPECT, REAL_CHEST_CM, type Frame, type Placement } from "./placement";

/** Photos narrower than this are too soft to zoom into; zoom shows a macro close-up instead */
export const MIN_ZOOM_PHOTO_PX = 1600;
/** Largest conformed canvas side, px (a 1200 px logo is already sharper than the photo) */
const MAX_CANVAS_PX = 1200;

// ---- Product photo, as brightness at its native resolution (loaded once per URL) ------------

type Photo = { gray: Gray; width: number; height: number };
const photos = new Map<string, Promise<Photo>>();
function loadPhoto(src: string): Promise<Photo> {
  let p = photos.get(src);
  if (!p) {
    p = new Promise<Photo>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        resolve({ gray: toGray(data, c.width, c.height), width: c.width, height: c.height });
      };
      img.onerror = reject;
      img.src = src;
    });
    photos.set(src, p);
  }
  return p;
}

export function usePhoto(src: string | undefined) {
  const [photo, setPhoto] = useState<{ src: string; photo: Photo } | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadPhoto(src)
      .then((p) => !cancelled && setPhoto({ src, photo: p }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);
  return photo && photo.src === src ? photo.photo : null;
}

/** Where the photo sits under the frame's cm grid (object-cover in the 2:3 frame) */
export function photoGeometry(photo: Photo, frame: Frame): PhotoGeometry {
  const fw = Math.min(photo.width, photo.height * IMAGE_ASPECT), fh = fw / IMAGE_ASPECT;
  return { photo: photo.gray, pxPerCm: fw / frame.w, originX: (photo.width - fw) / 2, originY: (photo.height - fh) / 2 };
}

const boxOf = (p: Placement, aspect: number): Box => ({ x: p.x, y: p.y, w: p.w, h: p.w / aspect });

/** The fabric under the logo and a summary of it (folds, direction, pattern). Positions are
 * rounded to 2 mm so dragging doesn't redo the analysis on every pointer move. */
export function useFabricUnder(photo: Photo | null, frame: Frame, placement: Placement, aspect: number) {
  const r = (n: number) => Math.round(n * 5) / 5;
  const x = r(placement.x), y = r(placement.y), w = r(placement.w);
  return useMemo(() => {
    if (!photo) return null;
    const patch = fabricPatch(photoGeometry(photo, frame), boxOf({ x, y, w, rotation: 0 }, aspect));
    const stats = fabricStats(patch);
    return { patch, stats, plain: stats.texture < PATTERN_MIN };
  }, [photo, frame, x, y, w, aspect]);
}

// ---- Stitched art, pre-scaled so sampling it doesn't alias ------------------------------------

type Pixels = { data: Uint8ClampedArray; w: number; h: number };
const artCache = new Map<string, Promise<Pixels>>();
function loadArt(src: string, width: number): Promise<Pixels> {
  const key = `${src.length}:${src.slice(-40)}:${width}`;
  let p = artCache.get(key);
  if (!p) {
    p = new Promise<Pixels>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const w = Math.max(1, Math.min(img.naturalWidth, width));
        const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: ctx.getImageData(0, 0, w, h).data, w, h });
      };
      img.onerror = reject;
      img.src = src;
    });
    artCache.set(key, p);
    if (artCache.size > 12) artCache.delete(artCache.keys().next().value!);
  }
  return p;
}

// ---- Conformed render, cached by everything that changes it ---------------------------------

export type ConformedArt = {
  canvas: HTMLCanvasElement;
  /** Transparent margin (px) around the logo box in the canvas */
  pad: number;
  /** Logo box size inside the canvas, px */
  bw: number;
  bh: number;
  key: string;
};
const renders = new Map<string, ConformedArt>();

/** The logo, stitched and conformed to the fabric at this position, rendered at the resolution
 * it's shown at (frame width × zoom × devicePixelRatio, capped). Re-renders 150 ms after the
 * last move / zoom change; until then the previous render keeps showing, scaled by CSS. */
export function useConformedArt(o: {
  src: string | null;
  fabricSrc: string | undefined;
  frame: Frame;
  placement: Placement;
  aspect: number;
  zoom: number;
  frameRef: React.RefObject<HTMLDivElement | null>;
  conformed: boolean;
  blend: "multiply" | "normal";
  enabled: boolean;
}) {
  const photo = usePhoto(o.enabled ? o.fabricSrc : undefined);
  const [art, setArt] = useState<ConformedArt | null>(null);
  const { src, frame, placement, aspect, zoom, conformed, blend, enabled, frameRef } = o;
  const r = (n: number) => Math.round(n * 20) / 20; // 0.5 mm
  const x = r(placement.x), y = r(placement.y), w = r(placement.w);
  const zoomKey = Math.round(zoom * 100) / 100;

  useEffect(() => {
    if (!enabled || !src || !photo) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      // Size on screen: the frame's layout width ignores the zoom transform, so apply it here
      const frameCss = frameRef.current?.offsetWidth ?? 450;
      const dpr = window.devicePixelRatio || 1;
      const want = (frameCss / frame.w) * zoomKey * dpr; // px per cm
      const scale = Math.min(want, MAX_CANVAS_PX / Math.max(w, w / aspect));
      const key = `${src.length}:${src.slice(-40)}|${o.fabricSrc}|${x},${y},${w},${aspect.toFixed(3)}|${scale.toFixed(2)}|${conformed}|${blend}`;
      const hit = renders.get(key);
      if (hit) {
        if (!cancelled) setArt(hit);
        return;
      }
      const box = boxOf({ x, y, w, rotation: 0 }, aspect);
      const pixels = await loadArt(src, Math.ceil(w * scale * 2)).catch(() => null);
      if (!pixels || cancelled) return;
      const patch: FabricPatch = fabricPatch(photoGeometry(photo, frame), box);
      const fit = frame.fit;
      const torso = fit ? { cx: fit.cx * frame.w, r: (fit.chest * frame.w) / 2 } : { cx: frame.w / 2, r: REAL_CHEST_CM / 2 };
      const res = conform({
        art: pixels,
        patch,
        torso,
        scale,
        // FOLD_WARP_PX is screen px at 1×; keep it proportional if the canvas was capped
        warpPx: FOLD_WARP_PX * zoomKey * dpr * (scale / want),
        conformed,
        shading: blend === "normal",
        texture: blend === "normal",
      });
      const canvas = document.createElement("canvas");
      canvas.width = res.w;
      canvas.height = res.h;
      canvas.getContext("2d")!.putImageData(new ImageData(res.data, res.w, res.h), 0, 0);
      const out: ConformedArt = { canvas, pad: res.pad, bw: res.w - 2 * res.pad, bh: res.h - 2 * res.pad, key };
      renders.set(key, out);
      if (renders.size > 16) renders.delete(renders.keys().next().value!);
      if (!cancelled) setArt(out);
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [enabled, src, photo, frame, x, y, w, aspect, zoomKey, conformed, blend, frameRef, o.fabricSrc]);

  // A render only counts for the same artwork, mode and blend (position/zoom may lag behind)
  const current = enabled && art && src && art.key.startsWith(`${src.length}:${src.slice(-40)}|${o.fabricSrc}|`) && art.key.endsWith(`|${conformed}|${blend}`) ? art : null;
  return { art: current, photo };
}

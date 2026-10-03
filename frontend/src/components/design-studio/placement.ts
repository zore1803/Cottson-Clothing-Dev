// Logo placement on a product photo, in real-world centimetres.
//
// The photo is shown in a 2:3 frame. How many cm that frame spans depends on how the garment
// was photographed, so each product carries a measured `fit` (scripts/measure-fit.mjs): the
// torso's width as a fraction of the frame. A size-M garment is ~52 cm across the chest, so a
// torso filling 42% of the frame means the frame is 52 / 0.42 ≈ 124 cm wide. Everything else
// (logo sizes, tier limits, the position dialog, stitch density) then works in true cm.
import type { Fit } from "@/lib/catalog";

export const IMAGE_ASPECT = 682 / 1024;
/** Chest width of a size-M garment, the scale reference for every photo */
export const REAL_CHEST_CM = 52;
/** Default logo width: a standard left-chest logo */
export const DEFAULT_LOGO_CM = 8;

/** Real-world size the photo frame spans, in cm, plus where the garment sits in it */
export type Frame = { w: number; h: number; fit?: Fit };
// Without a measured fit: the Essential Polo photo, whose torso fills ~58% of the frame (~90 cm)
export const frameFor = (fit?: Fit): Frame => {
  const w = fit ? REAL_CHEST_CM / fit.chest : 90;
  return { w, h: w / IMAGE_ASPECT, fit };
};
export const DEFAULT_FRAME = frameFor();

/** Top-left corner + width in cm; height follows the logo's own aspect ratio */
export type Placement = { x: number; y: number; w: number; rotation: number };

export type Finishing = {
  id: string;
  label: string;
  kind: "embroidery" | "print";
  maxColors: number;
  maxCm: number;
};

// Same finishing tiers as the reference studio: embroidery limits thread colors and size,
// digital transfer (printed) allows full color at four sizes.
export const FINISHINGS: Finishing[] = [
  { id: "emb-standard", label: "Embroidery (Standard)", kind: "embroidery", maxColors: 2, maxCm: 10 },
  { id: "emb-premium", label: "Embroidery (Premium)", kind: "embroidery", maxColors: 4, maxCm: 20 },
  { id: "dtf-s", label: "Digital transfer (S)", kind: "print", maxColors: 99, maxCm: 8 },
  { id: "dtf-m", label: "Digital transfer (M)", kind: "print", maxColors: 99, maxCm: 16 },
  { id: "dtf-l", label: "Digital transfer (L)", kind: "print", maxColors: 99, maxCm: 23 },
  { id: "dtf-xl", label: "Digital transfer (XL)", kind: "print", maxColors: 99, maxCm: 32 },
];
export const finishingById = (id: string) => FINISHINGS.find((f) => f.id === id) ?? FINISHINGS[0];
export const finishingHint = (f: Finishing) =>
  `Max ${f.maxColors} colors and ${f.maxCm}×${f.maxCm} cm`;

export const POSITIONS = [
  { id: "left-chest", label: "Left chest" },
  { id: "center-chest", label: "Center chest" },
  { id: "right-chest", label: "Right chest" },
] as const;
export type PositionId = (typeof POSITIONS)[number]["id"];

/** Centre point of a position, in cm. With a measured fit: chest logos 12 cm either side of the
 * torso's centre and 23 cm below the top of the garment (the collar tip, which stands a few cm
 * above the shoulder seam) — where the makers' own chest emblems sit on the catalog photos.
 * Centre-chest prints sit a little lower. (Left chest is the wearer's left: the viewer's right.) */
export const positionCenter = (frame: Frame, pos: PositionId) => {
  const { fit } = frame;
  if (!fit) {
    const f = { "left-chest": [0.63, 0.33], "center-chest": [0.5, 0.4], "right-chest": [0.37, 0.33] }[pos];
    return { cx: f[0] * frame.w, cy: f[1] * frame.h };
  }
  const cx = fit.cx * frame.w, top = fit.top * frame.h;
  if (pos === "center-chest") return { cx, cy: top + 28 };
  return { cx: cx + (pos === "left-chest" ? 12 : -12), cy: top + 23 };
};

/** Largest width that keeps both sides within the finishing's max size */
export const maxWidthFor = (f: Finishing, aspect: number) => Math.min(f.maxCm, f.maxCm * aspect);

export const placeAt = (frame: Frame, pos: PositionId, w: number, aspect: number, rotation = 0): Placement => {
  const { cx, cy } = positionCenter(frame, pos);
  return { x: cx - w / 2, y: cy - w / aspect / 2, w, rotation };
};

/** Widest the logo can get with any tier of this kind (embroidery tops out at Premium) */
export const largestWidthFor = (kind: Finishing["kind"], aspect: number) =>
  Math.max(...FINISHINGS.filter((f) => f.kind === kind).map((f) => maxWidthFor(f, aspect)));

/** When the logo is resized past its tier's limit, step up to the smallest tier of the same kind that fits */
export const tierFor = (current: Finishing, w: number, aspect: number) => {
  if (w <= maxWidthFor(current, aspect) + 1e-6) return current;
  return FINISHINGS.find((f) => f.kind === current.kind && w <= maxWidthFor(f, aspect) + 1e-6) ?? current;
};

/** The square print area for a placement: centred on the position, as large as the tier allows */
export const printArea = (frame: Frame, pos: PositionId, f: Finishing) => {
  const { cx, cy } = positionCenter(frame, pos);
  return { x: cx - f.maxCm / 2, y: cy - f.maxCm / 2, size: f.maxCm };
};

/** Where to zoom the photo to show the logo up close: its centre (fractions of the image) and a
 * zoom level that makes small logos readable without magnifying the photo into mush */
export type Focus = { px: number; py: number; z: number };
export const focusOn = (frame: Frame, p: Placement, aspect: number): Focus => ({
  px: (p.x + p.w / 2) / frame.w,
  py: (p.y + p.w / aspect / 2) / frame.h,
  // Zoom so the logo fills ~60% of the view, within limits
  z: Math.min(4, Math.max(1.8, (0.6 * frame.w) / p.w)),
});

export const round1 = (n: number) => Math.round(n * 10) / 10;

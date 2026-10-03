// Makes a stitched logo sit IN the fabric of a product photo rather than on top of it:
// it bends with the folds, wraps around the torso, picks up the fold shading and lets a
// little of the weave / stripes show through.
//
// Pure functions over typed arrays (no DOM), so the same code runs in the browser and in
// Node for offline checks. use-conformed-art.ts feeds it canvas pixels.

/** Luminance image, 0..1 */
export type Gray = { w: number; h: number; data: Float32Array };

// ---- Tuning ---------------------------------------------------------------------------

/** Largest fold displacement, in screen px at 1× zoom (scales with zoom, like the photo) */
export const FOLD_WARP_PX = 6;
/** Fold shading is measured after blurring this much, wider than weave / pinstripe period (~0.8 cm) */
export const FOLD_BLUR_CM = 1.5;
/** Relative brightness change per cm that counts as a full-strength fold (smaller = more warp) */
export const FOLD_GRADIENT_REF = 0.06;
/** Texture ("high-pass") scale: finer than folds, coarser than a single thread of the weave */
export const TEXTURE_BLUR_CM = 0.3;
/** How much of the fabric's texture shows through the thread (0.12 = ±12%) */
export const TEXTURE_AMOUNT = 0.12;
/** Patterned fabric (stripes, checks): how far the logo may turn to follow the pattern's local
 * direction, in degrees, and the window the direction is averaged over */
export const GRAIN_MAX_DEG = 20;
export const GRAIN_WINDOW_CM = 1.5;
/** Pattern contrast (relative) below which fabric counts as plain: no grain following */
export const PATTERN_MIN = 0.03;
/** Transparent margin around the logo box in the output, as a fraction of its width, so
 * content the warp pushes outward isn't clipped */
export const WARP_PAD = 0.15;
/** Fold shading transferred onto opaque thread: contrast around neutral, and opacity */
export const SHADE_CONTRAST = 2.4;
export const SHADE_OPACITY = 0.9;
/** 1 = full cylinder wrap around the torso; lower = milder edge compression */
export const CYLINDER_AMOUNT = 1;

// ---- Image helpers --------------------------------------------------------------------

export function toGray(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Gray {
  const data = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
  return { w, h, data };
}

export function crop(g: Gray, x0: number, y0: number, w: number, h: number): Gray {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = Math.min(g.w - 1, Math.max(0, x0 + x)), sy = Math.min(g.h - 1, Math.max(0, y0 + y));
      data[y * w + x] = g.data[sy * g.w + sx];
    }
  return { w, h, data };
}

/** Three passes of a box blur ≈ Gaussian with σ ≈ r (edges clamp) */
export function blur(g: Gray, r: number): Gray {
  if (r < 1) return g;
  const a = g.data.slice(), b = new Float32Array(a.length);
  const { w, h } = g;
  const pass = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    const len = horizontal ? w : h, lines = horizontal ? h : w;
    for (let l = 0; l < lines; l++) {
      const at = (i: number) => src[horizontal ? l * w + Math.min(len - 1, Math.max(0, i)) : Math.min(len - 1, Math.max(0, i)) * w + l];
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += at(i);
      for (let i = 0; i < len; i++) {
        dst[horizontal ? l * w + i : i * w + l] = sum / (2 * r + 1);
        sum += at(i + r + 1) - at(i - r);
      }
    }
  };
  for (let k = 0; k < 3; k++) {
    pass(a, b, true);
    pass(b, a, false);
  }
  return { w, h, data: a };
}

export function sobel(g: Gray): { gx: Gray; gy: Gray } {
  const { w, h } = g;
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  const at = (x: number, y: number) => g.data[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      gx[y * w + x] = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
      gy[y * w + x] = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
    }
  return { gx: { w, h, data: gx }, gy: { w, h, data: gy } };
}

/** Bilinear sample, clamped at the edges */
export function sample(g: Gray, x: number, y: number) {
  x = Math.min(g.w - 1, Math.max(0, x));
  y = Math.min(g.h - 1, Math.max(0, y));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(g.w - 1, x0 + 1), y1 = Math.min(g.h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0, d = g.data, w = g.w;
  return (d[y0 * w + x0] * (1 - fx) + d[y0 * w + x1] * fx) * (1 - fy) + (d[y1 * w + x0] * (1 - fx) + d[y1 * w + x1] * fx) * fy;
}

// ---- Fabric under the logo ----------------------------------------------------------------

/** Where the photo is, in cm: photo px = origin + cm · pxPerCm */
export type PhotoGeometry = { photo: Gray; pxPerCm: number; originX: number; originY: number };
/** Logo box on the frame, in cm */
export type Box = { x: number; y: number; w: number; h: number };

/** The fabric under (and a little around) a box, pre-filtered for folds and texture */
export type FabricPatch = {
  /** Patch px of frame cm (0, 0): patch px = origin + cm · pxPerCm */
  originX: number;
  originY: number;
  pxPerCm: number;
  lum: Gray;
  fold: Gray; // blurred past the weave: folds only
  tex: Gray; // blurred a little: shading without weave
  gx: Gray; // fold slope, relative brightness per cm
  gy: Gray;
  mean: number; // average brightness under the box
  box: Box;
  /** Patterned fabric only: how far the pattern locally turns away from straight (radians,
   * already weighted by how clear the pattern is there). null on plain fabric. */
  grain: Gray | null;
};

/** Local direction of a stripe / check pattern, relative to its nearest straight axis. Stripes
 * sewn on a flat garment run straight; where the photo shows them turning, the fabric itself
 * has turned (drape, the curve toward the shoulder), and a logo sewn onto it turns with it. */
function grainField(lum: Gray, pxPerCm: number, patternContrast: number): Gray | null {
  if (patternContrast < PATTERN_MIN) return null; // plain fabric: nothing to follow
  const { jx, jy } = (() => {
    const s = sobel(lum);
    return { jx: s.gx.data, jy: s.gy.data };
  })();
  const n = lum.w * lum.h;
  const mk = (f: (i: number) => number): Gray => {
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = f(i);
    return { w: lum.w, h: lum.h, data: d };
  };
  // Structure tensor, averaged over a small window
  const r = Math.max(1, Math.round(GRAIN_WINDOW_CM * pxPerCm));
  const jxx = blur(mk((i) => jx[i] * jx[i]), r), jyy = blur(mk((i) => jy[i] * jy[i]), r), jxy = blur(mk((i) => jx[i] * jy[i]), r);
  // Overall direction decides the pattern's straight axis (vertical or horizontal stripes)
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += jxx.data[i];
    syy += jyy.data[i];
    sxy += jxy.data[i];
  }
  const overall = Math.sqrt((sxx - syy) ** 2 + 4 * sxy * sxy) / Math.max(1e-9, sxx + syy);
  if (overall < 0.35) return null; // no clear pattern: plain fabric
  const axis = Math.abs(sxx) > Math.abs(syy) ? 0 : Math.PI / 2; // gradient mostly across x: vertical stripes
  const max = (GRAIN_MAX_DEG * Math.PI) / 180;
  return mk((i) => {
    const a = jxx.data[i], b = jyy.data[i], c = jxy.data[i];
    const coherence = Math.sqrt((a - b) ** 2 + 4 * c * c) / Math.max(1e-9, a + b);
    let d = 0.5 * Math.atan2(2 * c, a - b) - axis; // gradient direction vs. its straight axis
    d = ((d + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2;
    const weight = Math.min(1, Math.max(0, (coherence - 0.3) / 0.4));
    return Math.max(-max, Math.min(max, d)) * weight;
  });
}

export function fabricPatch({ photo, pxPerCm, originX, originY }: PhotoGeometry, box: Box): FabricPatch {
  const rFold = Math.max(1, Math.round(FOLD_BLUR_CM * pxPerCm));
  const margin = Math.max(rFold * 2 + 2, Math.ceil((WARP_PAD + 0.1) * box.w * pxPerCm));
  const left = Math.floor(originX + box.x * pxPerCm) - margin;
  const top = Math.floor(originY + box.y * pxPerCm) - margin;
  const w = Math.ceil(box.w * pxPerCm) + 2 * margin, h = Math.ceil(box.h * pxPerCm) + 2 * margin;
  const lum = crop(photo, left, top, w, h);
  const fold = blur(lum, rFold);
  const tex = blur(lum, Math.max(1, Math.round(TEXTURE_BLUR_CM * pxPerCm)));
  let sum = 0, pattern = 0, n = 0;
  for (let y = margin; y < h - margin; y++)
    for (let x = margin; x < w - margin; x++, n++) {
      sum += fold.data[y * w + x];
      pattern += Math.abs(lum.data[y * w + x] - tex.data[y * w + x]);
    }
  const mean = Math.max(0.04, n ? sum / n : 0.5);
  const { gx, gy } = sobel(fold);
  // px⁻¹ → cm⁻¹, relative to the fabric's own brightness (so dark shirts fold as much as light ones)
  const k = pxPerCm / mean;
  for (let i = 0; i < gx.data.length; i++) {
    gx.data[i] *= k;
    gy.data[i] *= k;
  }
  return { box, originX: originX - left, originY: originY - top, pxPerCm, lum, fold, tex, gx, gy, mean, grain: grainField(lum, pxPerCm, pattern / Math.max(1, n) / mean) };
}

/** Summary of the fabric under the logo: how strongly it folds, which way the folds run, and
 * how much pattern (stripes, weave) it has */
export function fabricStats(p: FabricPatch) {
  // Structure tensor of the fold slopes: its main axis is the slope direction; folds run across it
  let sxx = 0, syy = 0, sxy = 0, mag = 0, tex = 0, n = 0;
  // Only the fabric under the logo box itself (the patch has a margin around it)
  const x0 = Math.round(p.originX + p.box.x * p.pxPerCm), y0 = Math.round(p.originY + p.box.y * p.pxPerCm);
  const x1 = Math.round(x0 + p.box.w * p.pxPerCm), y1 = Math.round(y0 + p.box.h * p.pxPerCm);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++, n++) {
      const i = y * p.lum.w + x, gx = p.gx.data[i], gy = p.gy.data[i];
      sxx += gx * gx;
      syy += gy * gy;
      sxy += gx * gy;
      mag += Math.hypot(gx, gy);
      tex += Math.abs(p.lum.data[i] - p.tex.data[i]);
    }
  n = Math.max(1, n);
  const slopeAngle = 0.5 * Math.atan2(2 * sxy, sxx - syy); // radians, direction of steepest change
  const coherence = Math.sqrt((sxx - syy) ** 2 + 4 * sxy * sxy) / Math.max(1e-9, sxx + syy);
  return {
    /** 0 = flat, 1 = folds at FOLD_GRADIENT_REF on average */
    foldStrength: mag / n / FOLD_GRADIENT_REF,
    /** Direction the folds run (perpendicular to the slope), degrees */
    foldAngleDeg: ((slopeAngle * 180) / Math.PI + 90 + 180) % 180,
    /** 0 = no dominant direction, 1 = all folds parallel */
    coherence,
    /** Average weave / pattern contrast, relative to the fabric brightness (pinstripes ≈ 0.1) */
    texture: tex / n / p.mean,
  };
}

/** Stitch direction for a logo on this fabric: along the folds when they're clear enough to
 * matter, else the usual 45°. Quantised to 15° so small drags don't re-stitch the logo. */
export function stitchAngleFor(stats: ReturnType<typeof fabricStats>) {
  if (stats.foldStrength < 0.35 || stats.coherence < 0.3) return 45;
  return (Math.round(stats.foldAngleDeg / 15) * 15) % 180;
}

/** Stripes under the logo, for redrawing the fabric sharply in a close-up: direction, spacing,
 * whether the stripes are lighter or darker than the ground, and how wide they are. Null when
 * the fabric has no regular stripe (plain, knit, random texture). */
export function stripePattern(p: FabricPatch) {
  const x0 = Math.round(p.originX + p.box.x * p.pxPerCm), y0 = Math.round(p.originY + p.box.y * p.pxPerCm);
  const w = Math.round(p.box.w * p.pxPerCm), h = Math.round(p.box.h * p.pxPerCm);
  if (w < 12 || h < 12) return null;
  const hp = (x: number, y: number) => p.lum.data[y * p.lum.w + x] - p.tex.data[y * p.lum.w + x];
  // Average the fine detail down columns and along rows: stripes survive one of the two
  const cols = new Float32Array(w), rows = new Float32Array(h);
  let pos = 0, neg = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = hp(x0 + x, y0 + y);
      cols[x] += v / h;
      rows[y] += v / w;
      if (v > 0) pos += v * v * v;
      else neg -= v * v * v;
    }
  const energy = (a: Float32Array) => a.reduce((s, v) => s + v * v, 0) / a.length;
  const vertical = energy(cols) >= energy(rows);
  const prof = vertical ? cols : rows;
  // Autocorrelation: the first strong peak is the stripe spacing
  const e0 = energy(prof);
  if (e0 / (p.mean * p.mean) < 1e-4) return null;
  let best = 0, lag = 0;
  for (let l = 2; l < prof.length / 3; l++) {
    let s = 0;
    for (let i = 0; i + l < prof.length; i++) s += prof[i] * prof[i + l];
    const c = s / (prof.length - l) / e0;
    if (c > best) {
      best = c;
      lag = l;
    }
  }
  if (best < 0.4) return null;
  // Thin light lines on a darker ground have a long bright tail (positive skew), and vice versa
  const light = pos > neg;
  let over = 0;
  for (const v of prof) if (light ? v > 0 : v < 0) over++;
  return { vertical, periodCm: lag / p.pxPerCm, light, duty: Math.min(0.5, Math.max(0.12, over / prof.length)) };
}

// ---- The warp -----------------------------------------------------------------------------

export type ConformOptions = {
  /** The stitched logo (straight-alpha RGBA) */
  art: { data: Uint8ClampedArray | Uint8Array; w: number; h: number };
  /** Fabric under the logo box (the box is patch.box) */
  patch: FabricPatch;
  /** Torso centre and radius, in frame cm, for the cylinder wrap */
  torso: { cx: number; r: number };
  /** Output resolution: px per cm (square pixels) */
  scale: number;
  /** Largest fold displacement, in output px */
  warpPx: number;
  /** false: the flat baseline (no warp, wrap or texture) to compare against */
  conformed: boolean;
  /** Transfer fold shading onto the thread (opaque thread); off when the page multiplies instead */
  shading: boolean;
  /** Let the fabric's texture show through (off when the page multiplies: that shows it already) */
  texture: boolean;
};

/** The rendered logo box plus a transparent margin of `pad` px on every side */
export type ConformResult = { data: Uint8ClampedArray<ArrayBuffer>; w: number; h: number; pad: number };

const softLight = (b: number, s: number) =>
  s <= 0.5 ? b - (1 - 2 * s) * b * (1 - b) : b + (2 * s - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b);

/** Render the logo box on the fabric. Each output pixel works out where it lands on the flat
 * logo (inverse mapping, in this order: follow the pattern's grain, fold displacement, cylinder
 * wrap), then takes on the fabric's shading and a faint copy of its texture. */
export function conform(o: ConformOptions): ConformResult {
  const { art, patch, torso, scale } = o;
  const box = patch.box;
  const bw = Math.max(1, Math.round(box.w * scale)), bh = Math.max(1, Math.round(box.h * scale));
  const pad = o.conformed ? Math.ceil(bw * WARP_PAD) : 0;
  const W = bw + 2 * pad, H = bh + 2 * pad;
  const res = new Uint8ClampedArray(W * H * 4);
  const cmPerPx = box.w / bw; // square output pixels

  // Premultiply once so bilinear sampling doesn't pull dark fringes in from transparent pixels
  const pm = new Float32Array(art.w * art.h * 4);
  for (let i = 0; i < art.w * art.h; i++) {
    const a = art.data[i * 4 + 3] / 255;
    pm[i * 4] = (art.data[i * 4] / 255) * a;
    pm[i * 4 + 1] = (art.data[i * 4 + 1] / 255) * a;
    pm[i * 4 + 2] = (art.data[i * 4 + 2] / 255) * a;
    pm[i * 4 + 3] = a;
  }
  const px = [0, 0, 0, 0];
  /** Flat logo at (u, v), fractions of its width/height */
  const sampleArt = (u: number, v: number) => {
    px[0] = px[1] = px[2] = px[3] = 0;
    if (u < 0 || v < 0 || u > 1 || v > 1) return;
    const x = Math.min(art.w - 1, Math.max(0, u * art.w - 0.5)), y = Math.min(art.h - 1, Math.max(0, v * art.h - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(art.w - 1, x0 + 1), y1 = Math.min(art.h - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    for (let c = 0; c < 4; c++)
      px[c] =
        (pm[(y0 * art.w + x0) * 4 + c] * (1 - fx) + pm[(y0 * art.w + x1) * 4 + c] * fx) * (1 - fy) +
        (pm[(y1 * art.w + x0) * 4 + c] * (1 - fx) + pm[(y1 * art.w + x1) * 4 + c] * fx) * fy;
  };
  // Fabric (patch px) under an output pixel
  const fabX = (ox: number) => patch.originX + (box.x + (ox - pad + 0.5) * cmPerPx) * patch.pxPerCm - 0.5;
  const fabY = (oy: number) => patch.originY + (box.y + (oy - pad + 0.5) * cmPerPx) * patch.pxPerCm - 0.5;

  // Grain: how far the pattern turns in each column, averaged down the box and smoothed across,
  // then integrated so the logo's horizontal lines follow it as smooth curves (no tearing)
  const phi = new Float32Array(W), rise = new Float32Array(W);
  if (o.conformed && patch.grain) {
    const rows = 9;
    for (let ox = 0; ox < W; ox++) {
      let sum = 0;
      for (let k = 0; k < rows; k++) sum += sample(patch.grain, fabX(ox), fabY(pad + ((k + 0.5) / rows) * bh));
      phi[ox] = sum / rows;
    }
    phi.set(blur({ w: W, h: 1, data: phi }, Math.max(1, Math.round(1 / cmPerPx))).data); // ~1 cm
    // Vertical offset of a horizontal line, relative to the logo's centre column
    const mid = Math.floor(W / 2);
    for (let ox = mid + 1; ox < W; ox++) rise[ox] = rise[ox - 1] + Math.tan(phi[ox]);
    for (let ox = mid - 1; ox >= 0; ox--) rise[ox] = rise[ox + 1] - Math.tan(phi[ox]);
  }

  // Cylinder: the logo is sewn flat onto a torso of radius r, so arc length s from the torso
  // centre shows up at x = cx + r·sin(s / r) — squeezed more the further out it sits
  const r = torso.r / Math.max(1e-3, CYLINDER_AMOUNT);
  const arcAt = (xCm: number) => r * Math.asin(Math.min(0.999, Math.max(-0.999, (xCm - torso.cx) / r)));
  const arcLeft = arcAt(box.x + box.w / 2) - box.w / 2;

  for (let oy = 0; oy < H; oy++)
    for (let ox = 0; ox < W; ox++) {
      const ppx = fabX(ox), ppy = fabY(oy);
      // Position within the box, output px (the box spans 0..bw × 0..bh)
      let bx = ox - pad + 0.5, by = oy - pad + 0.5;
      let u: number;
      if (o.conformed) {
        // 1. Grain: the column is tilted by phi and shifted by the accumulated rise
        const v = by - bh / 2 - rise[ox];
        bx += v * phi[ox];
        by = bh / 2 + v;
        // 2. Folds: displaced along the slope of the (blurred) shading, capped at warpPx
        let dx = -sample(patch.gx, ppx, ppy) / FOLD_GRADIENT_REF, dy = -sample(patch.gy, ppx, ppy) / FOLD_GRADIENT_REF;
        const m = Math.hypot(dx, dy);
        if (m > 1) {
          dx /= m;
          dy /= m;
        }
        bx -= dx * o.warpPx;
        by -= dy * o.warpPx;
        // 3. Cylinder wrap
        u = (arcAt(box.x + bx * cmPerPx) - arcLeft) / box.w;
      } else u = bx / bw;
      sampleArt(u, by / bh);
      const a = px[3];
      if (a <= 0.002) continue;

      let rr = px[0] / a, gg = px[1] / a, bb = px[2] / a;
      if (o.shading) {
        // Fold shading, normalised so the fabric's average tone is neutral
        const s = Math.min(1, Math.max(0, 0.5 + (SHADE_CONTRAST / 2) * (sample(patch.tex, ppx, ppy) / patch.mean - 1)));
        rr += (softLight(rr, s) - rr) * SHADE_OPACITY;
        gg += (softLight(gg, s) - gg) * SHADE_OPACITY;
        bb += (softLight(bb, s) - bb) * SHADE_OPACITY;
      }
      if (o.conformed && o.texture) {
        // A faint copy of the weave / stripes: fine detail only (photo minus its slightly blurred self)
        const hp = (sample(patch.lum, ppx, ppy) - sample(patch.tex, ppx, ppy)) / patch.mean;
        const f = 1 + TEXTURE_AMOUNT * Math.max(-1, Math.min(1, hp * 5));
        rr *= f;
        gg *= f;
        bb *= f;
      }
      const i = (oy * W + ox) * 4;
      res[i] = rr * 255;
      res[i + 1] = gg * 255;
      res[i + 2] = bb * 255;
      res[i + 3] = a * 255;
    }
  return { data: res, w: W, h: H, pad };
}

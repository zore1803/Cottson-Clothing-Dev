// Shared compositing core for the mannequin mockups. Pure TypeScript on typed arrays: no DOM,
// React or Next imports, so the browser renderer, the Node tests and the batch script all run
// this exact code. (Only `import type` from other modules: Node strips those, so it runs as-is.)
//
// Layer contract: see public/mockups/README.md, "Mannequin templates".

export type RGB = readonly [number, number, number];

/** One recoloured layer: a mask (alpha, 0..255) painted in a colour, shaded by the fabric */
export type PaintLayer = {
  /** Mask alpha, width × height */
  mask: Uint8Array;
  colour: RGB;
  /** Pixel bounds of the mask's non-zero area [x0, y0, x1, y1) (see maskBounds); speeds up the loops */
  bounds: Bounds;
};

export type Bounds = readonly [number, number, number, number];

/** A logo already fitted to its zone (see fitLogo), in canvas pixels */
export type PlacedLogo = {
  /** Straight-alpha RGBA of the logo image */
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
  /** Centre and size of the logo box on the canvas, rotation in degrees (clockwise) */
  cx: number;
  cy: number;
  boxW: number;
  boxH: number;
  rotation: number;
  /** Folds carried onto the logo: 0 = none, 1 = the full shading (existing ghost logic uses 0.2) */
  shadeStrength: number;
};

export type CompositeInput = {
  width: number;
  height: number;
  /** null (default): transparent — the mockup layers are transparent outside the mannequin and
   * shirt. A colour only for exports to formats without alpha. */
  background: RGB | null;
  /** mannequin.png, straight RGBA; drawn first, never recoloured */
  mannequin: Uint8ClampedArray | null;
  /** base.png R channel (or base-pocket.png) */
  shading: Uint8Array;
  /** base.png value for flat fabric (200) */
  shadingScale: number;
  foldStrength: number;
  /** Contrast shading + grain (mannequin templates with shading.gainBase / grain) */
  contrast?: Omit<ShadingParams, "foldStrength"> | null;
  /** Regions in draw order, then trims in draw order */
  layers: PaintLayer[];
  /** Logo, clipped to this mask (mask-body) */
  logo?: { placed: PlacedLogo; clip: Uint8Array } | null;
  /** RGBA drawn last, never recoloured (zipper) */
  details: Uint8ClampedArray[];
};

// ---- Colour formula (brief section 3) ----------------------------------------------------------

/**
 * Picked colour c shaded by multiplier S:
 *   lum  = (r + g + b) / (3·255)
 *   lift = (S − 1)·255·foldStrength·(1 − lum)·0.5     (dark colours keep their folds)
 *   out  = clamp(c·S + lift, 0, 255)
 */
export function shadeColour(c: RGB, S: number, foldStrength: number): [number, number, number] {
  const lum = (c[0] + c[1] + c[2]) / (3 * 255);
  const lift = (S - 1) * 255 * foldStrength * (1 - lum) * 0.5;
  const f = (v: number) => Math.min(255, Math.max(0, Math.round(v * S + lift)));
  return [f(c[0]), f(c[1]), f(c[2])];
}

/** Contrast shading (templates with shading.gainBase): folds kept on dark colours */
export type ShadingParams = {
  foldStrength: number;
  /** Shading contrast gain: gainBase + gainDark·(1 − lum). Absent = the flat formula above */
  gainBase?: number;
  gainDark?: number;
  /** Fabric grain: seeded noise through region masks. Absent = no grain */
  grain?: { amp: number; ampDark: number; sigma: number; seed: number };
};

/**
 * Shaded colour before grain, unclamped (the grain multiplies it, then it's clamped):
 *   lum  = (r+g+b)/765,   gain = gainBase + gainDark·(1 − lum)
 *   Sp   = clamp(1 + gain·(S − 1), 0.25, 1.6)
 *   lift = (Sp − 1)·255·foldStrength·(1 − lum)·0.5,   col = c·Sp + lift
 */
export function shadeColourContrast(c: RGB, S: number, p: ShadingParams): [number, number, number] {
  const lum = (c[0] + c[1] + c[2]) / 765;
  const gain = (p.gainBase ?? 1) + (p.gainDark ?? 0) * (1 - lum);
  const Sp = Math.min(1.6, Math.max(0.25, 1 + gain * (S - 1)));
  const lift = (Sp - 1) * 255 * p.foldStrength * (1 - lum) * 0.5;
  return [c[0] * Sp + lift, c[1] * Sp + lift, c[2] * Sp + lift];
}

/** Grain amplitude for a colour: amp + ampDark·(1 − lum) */
export const grainAmpFor = (c: RGB, g: { amp: number; ampDark: number }) => g.amp + g.ampDark * (1 - (c[0] + c[1] + c[2]) / 765);

/** mulberry32: small seeded PRNG, identical in every JS engine */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grainCache = new Map<string, Float32Array>();
/**
 * Fabric grain for a template size: unit-variance Gaussian noise from mulberry32(seed) (Box–Muller),
 * blurred with a Gaussian of `sigma` px, then re-normalised to mean 0, std 1. Generated once per
 * (size, seed, sigma) and cached; the same inputs give the same numbers in the browser and Node.
 */
export function grainField(W: number, H: number, seed: number, sigma: number): Float32Array {
  const key = `${W}x${H}:${seed}:${sigma}`;
  const hit = grainCache.get(key);
  if (hit) return hit;
  const n = W * H, rand = mulberry32(seed);
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.max(rand(), 1e-12), u2 = rand();
    const r = Math.sqrt(-2 * Math.log(u1)), a = 2 * Math.PI * u2;
    noise[i] = r * Math.cos(a);
    if (i + 1 < n) noise[i + 1] = r * Math.sin(a);
  }
  // Separable Gaussian blur, edges clamped
  const rad = Math.max(1, Math.ceil(3 * sigma));
  const k: number[] = [];
  let ks = 0;
  for (let x = -rad; x <= rad; x++) ks += k[k.push(Math.exp(-(x * x) / (2 * sigma * sigma))) - 1];
  for (let j = 0; j < k.length; j++) k[j] /= ks;
  const tmp = new Float32Array(n), out = new Float32Array(n);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let j = -rad; j <= rad; j++) s += noise[y * W + Math.min(W - 1, Math.max(0, x + j))] * k[j + rad];
      tmp[y * W + x] = s;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let j = -rad; j <= rad; j++) s += tmp[Math.min(H - 1, Math.max(0, y + j)) * W + x] * k[j + rad];
      out[y * W + x] = s;
    }
  let mean = 0;
  for (let i = 0; i < n; i++) mean += out[i];
  mean /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (out[i] - mean) ** 2;
  const std = Math.sqrt(v / n) || 1;
  for (let i = 0; i < n; i++) out[i] = (out[i] - mean) / std;
  grainCache.set(key, out);
  return out;
}

/**
 * A lookup of shadeColour for every possible base value (0..255) for one colour: the per-pixel
 * work then becomes a table read. Entry v·3 + k = channel k at S = v / scale.
 */
export function shadeTable(c: RGB, scale: number, foldStrength: number): Uint8ClampedArray {
  const t = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const o = shadeColour(c, v / scale, foldStrength);
    t[v * 3] = o[0];
    t[v * 3 + 1] = o[1];
    t[v * 3 + 2] = o[2];
  }
  return t;
}

// ---- Helpers ------------------------------------------------------------------------------------

/** Bounds of a mask's non-zero pixels, [x0, y0, x1, y1); empty masks give [0, 0, 0, 0] */
export function maskBounds(mask: Uint8Array, width: number, height: number): Bounds {
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++)
      if (mask[row + x]) {
        if (x < x0) x0 = x;
        if (x >= x1) x1 = x + 1;
        if (y < y0) y0 = y;
        y1 = y + 1;
      }
  }
  return x1 > x0 ? [x0, y0, x1, y1] : [0, 0, 0, 0];
}

/** Mirror an image left-right (virtual side-right view). channels = 1 (mask/shading) or 4 (RGBA) */
export function flipHorizontal<T extends Uint8Array | Uint8ClampedArray>(src: T, width: number, height: number, channels: number): T {
  const out = new (src.constructor as { new (n: number): T })(src.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const a = (y * width + x) * channels, b = (y * width + (width - 1 - x)) * channels;
      for (let k = 0; k < channels; k++) out[b + k] = src[a + k];
    }
  return out;
}

/**
 * Grow part masks by 1 px, only where the body is solidly present (alpha > 0.3). Fixes a thin
 * rim of body colour around a contrasting part when the body mask is slightly larger than the
 * parts. Behind a config flag (dilateParts); never applied to trims, never changes the assets.
 */
export function dilateWithinBody(mask: Uint8Array, body: Uint8Array, width: number, height: number): Uint8Array {
  const out = mask.slice();
  const bodyMin = Math.round(0.3 * 255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (body[i] <= bodyMin) continue;
      let m = mask[i];
      if (x > 0 && mask[i - 1] > m) m = mask[i - 1];
      if (x < width - 1 && mask[i + 1] > m) m = mask[i + 1];
      if (y > 0 && mask[i - width] > m) m = mask[i - width];
      if (y < height - 1 && mask[i + width] > m) m = mask[i + width];
      out[i] = m;
    }
  return out;
}

/** Scale-to-fit a logo in a zone keeping its aspect ratio, then scale by the slider (0.5–1) */
export function fitLogo(zone: { x: number; y: number; w: number; h: number }, logoW: number, logoH: number, scale: number) {
  const s = Math.min(1, Math.max(0.5, scale));
  const k = Math.min(zone.w / logoW, zone.h / logoH) * s;
  return { boxW: logoW * k, boxH: logoH * k, cx: zone.x + zone.w / 2, cy: zone.y + zone.h / 2 };
}

// ---- Compositing ---------------------------------------------------------------------------------

/**
 * Render one view to straight-alpha RGBA (width × height × 4), source-over throughout:
 * [background] → mannequin → regions → trims (all shaded by the fabric) → logo (clipped to the
 * body) → details. The canvas starts fully transparent (unless a background is given). Blending
 * runs on premultiplied colour, which is exact for layers over partly transparent pixels, so the
 * mannequin's soft fades and edges stay soft:  C' = c·a + C·(1−a),  A' = a + A·(1−a).
 */
export function composite(input: CompositeInput): Uint8ClampedArray {
  const { width: W, height: H } = input;
  const n = W * H;
  // Premultiplied colour + alpha (0..1), in float so each pixel rounds once, at the end
  const r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n), A = new Float32Array(n);
  if (input.background) {
    r.fill(input.background[0]);
    g.fill(input.background[1]);
    b.fill(input.background[2]);
    A.fill(1);
  }
  const blend = (i: number, cr: number, cg: number, cb: number, t: number) => {
    const k = 1 - t;
    r[i] = cr * t + r[i] * k;
    g[i] = cg * t + g[i] * k;
    b[i] = cb * t + b[i] * k;
    A[i] = t + A[i] * k;
  };

  const over = (src: Uint8ClampedArray) => {
    for (let i = 0; i < n; i++) {
      const a = src[i * 4 + 3];
      if (a) blend(i, src[i * 4], src[i * 4 + 1], src[i * 4 + 2], a / 255);
    }
  };

  if (input.mannequin) over(input.mannequin);

  const shading = input.shading;
  const cp = input.contrast;
  if (cp && cp.gainBase !== undefined) {
    // Contrast formula: an unclamped table per shading value, then grain, then clamp
    const p: ShadingParams = { ...cp, foldStrength: input.foldStrength };
    const grain = cp.grain ? grainField(W, H, cp.grain.seed, cp.grain.sigma) : null;
    for (const layer of input.layers) {
      const tab = new Float32Array(256 * 3);
      for (let v = 0; v < 256; v++) tab.set(shadeColourContrast(layer.colour, v / input.shadingScale, p), v * 3);
      const amp = cp.grain ? grainAmpFor(layer.colour, cp.grain) : 0;
      const [x0, y0, x1, y1] = layer.bounds;
      const m = layer.mask;
      for (let y = y0; y < y1; y++)
        for (let x = x0, i = y * W + x0; x < x1; x++, i++) {
          const a = m[i];
          if (!a) continue;
          const s = shading[i] * 3, f = grain ? 1 + amp * grain[i] : 1;
          const cl = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
          blend(i, cl(tab[s] * f), cl(tab[s + 1] * f), cl(tab[s + 2] * f), a / 255);
        }
    }
  } else
  for (const layer of input.layers) {
    const table = shadeTable(layer.colour, input.shadingScale, input.foldStrength);
    const [x0, y0, x1, y1] = layer.bounds;
    const m = layer.mask;
    for (let y = y0; y < y1; y++)
      for (let x = x0, i = y * W + x0; x < x1; x++, i++) {
        const a = m[i];
        if (!a) continue;
        const s = shading[i] * 3;
        blend(i, table[s], table[s + 1], table[s + 2], a / 255);
      }
  }

  if (input.logo) drawLogo(input.logo.placed, input.logo.clip, shading, input.shadingScale, W, H, blend);

  for (const d of input.details) over(d);

  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const a = A[i];
    if (a <= 0) continue; // fully transparent: RGBA 0,0,0,0
    out[i * 4] = Math.round(r[i] / a);
    out[i * 4 + 1] = Math.round(g[i] / a);
    out[i * 4 + 2] = Math.round(b[i] / a);
    out[i * 4 + 3] = Math.round(a * 255);
  }
  return out;
}

/** FNV-1a hash of a render's bytes (browser vs Node determinism checks) */
export function hashRgba(rgba: Uint8ClampedArray): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < rgba.length; i++) h = Math.imul(h ^ rgba[i], 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Flatten straight-alpha RGBA onto a solid colour (for exports without alpha, and tests) */
export function flattenOnto(rgba: Uint8ClampedArray, bg: RGB): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const t = rgba[i + 3] / 255;
    out[i] = Math.round(rgba[i] * t + bg[0] * (1 - t));
    out[i + 1] = Math.round(rgba[i + 1] * t + bg[1] * (1 - t));
    out[i + 2] = Math.round(rgba[i + 2] * t + bg[2] * (1 - t));
    out[i + 3] = 255;
  }
  return out;
}

/**
 * The logo, drawn upright on the canvas (after any mirroring, so text never reverses): each canvas
 * pixel in its rotated box samples the logo bilinearly (premultiplied), takes on the fabric's folds
 * (colour × (1 − k + k·S), the ghost renderer's light multiply), and is clipped to the body.
 */
function drawLogo(
  p: PlacedLogo,
  clip: Uint8Array,
  shading: Uint8Array,
  scale: number,
  W: number,
  H: number,
  blend: (i: number, r: number, g: number, b: number, t: number) => void
) {
  const rad = (p.rotation * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const hw = p.boxW / 2, hh = p.boxH / 2;
  const ext = Math.ceil(Math.abs(hw * cos) + Math.abs(hh * sin)) + 1, eyt = Math.ceil(Math.abs(hw * sin) + Math.abs(hh * cos)) + 1;
  const x0 = Math.max(0, Math.floor(p.cx - ext)), x1 = Math.min(W, Math.ceil(p.cx + ext));
  const y0 = Math.max(0, Math.floor(p.cy - eyt)), y1 = Math.min(H, Math.ceil(p.cy + eyt));
  const src = p.rgba, lw = p.w, lh = p.h;
  const px = (x: number, y: number, c: number) => src[(y * lw + x) * 4 + c];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = y * W + x;
      if (!clip[i]) continue;
      // Canvas pixel centre → logo box coordinates (inverse rotation) → logo pixels
      const dx = x + 0.5 - p.cx, dy = y + 0.5 - p.cy;
      const u = dx * cos + dy * sin, v = -dx * sin + dy * cos;
      if (u < -hw || u >= hw || v < -hh || v >= hh) continue;
      const sx = ((u + hw) / p.boxW) * lw - 0.5, sy = ((v + hh) / p.boxH) * lh - 0.5;
      const ax = Math.max(0, Math.min(lw - 1, Math.floor(sx))), ay = Math.max(0, Math.min(lh - 1, Math.floor(sy)));
      const bx = Math.min(lw - 1, ax + 1), by = Math.min(lh - 1, ay + 1);
      const fx = Math.min(1, Math.max(0, sx - ax)), fy = Math.min(1, Math.max(0, sy - ay));
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      const a00 = px(ax, ay, 3), a10 = px(bx, ay, 3), a01 = px(ax, by, 3), a11 = px(bx, by, 3);
      const aSum = a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11;
      if (aSum <= 0) continue;
      const pr = (px(ax, ay, 0) * a00 * w00 + px(bx, ay, 0) * a10 * w10 + px(ax, by, 0) * a01 * w01 + px(bx, by, 0) * a11 * w11) / aSum;
      const pg = (px(ax, ay, 1) * a00 * w00 + px(bx, ay, 1) * a10 * w10 + px(ax, by, 1) * a01 * w01 + px(bx, by, 1) * a11 * w11) / aSum;
      const pb = (px(ax, ay, 2) * a00 * w00 + px(bx, ay, 2) * a10 * w10 + px(ax, by, 2) * a01 * w01 + px(bx, by, 2) * a11 * w11) / aSum;
      const fold = 1 - p.shadeStrength + p.shadeStrength * (shading[i] / scale);
      blend(i, Math.min(255, pr * fold), Math.min(255, pg * fold), Math.min(255, pb * fold), (aSum / 255) * (clip[i] / 255));
    }
}

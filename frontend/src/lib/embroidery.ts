// Renders an uploaded logo as embroidery: the logo is reduced to a few thread colors
// (embroidery machines have a limited number of needles), then filled with individual
// satin / tatami stitches drawn one by one on a canvas, each shaded like a round thread.
// The result is a transparent PNG that sits on the garment photo in place of the flat logo.

type RGB = [number, number, number];

export type EmbroideryOptions = {
  /** Max thread colors (Standard = 2, Premium = 4) */
  maxColors: number;
  /** Stitch everything in one thread color instead of the logo's own colors */
  thread?: string | null;
  /** Width of the output in px (height follows the logo's aspect ratio) */
  width?: number;
  /** Real-world width of the logo, used to size stitches like ~0.4 mm thread */
  widthCm?: number;
  /** Grow every stroke outward by this much (mm per side) before stitching, so hairlines and
   * small text get wide enough to hold a satin stitch */
  thickenMm?: number;
  /** Stitch direction in degrees (0 = horizontal, 90 = vertical); default 45 */
  angleDeg?: number;
  /** Stitch every visible pixel, including a solid background colour (e.g. a logo on a filled
   * square). Default false: the colour at the corners of an opaque image is treated as background. */
  keepBackground?: boolean;
};

/** Stock embroidery thread colors offered in the thread picker */
export const THREADS = [
  { id: "white", name: "White", hex: "#f4f4f1" },
  { id: "silver", name: "Silver", hex: "#b9bdc3" },
  { id: "gold", name: "Gold", hex: "#c9a14a" },
  { id: "red", name: "Red", hex: "#c8102e" },
  { id: "navy", name: "Navy", hex: "#1f2a44" },
  { id: "black", name: "Black", hex: "#1c1c1c" },
] as const;

/** Grow the logo's shape outward by `steps` px; each new pixel takes a neighbor's thread color */
function dilate(mask: Uint8Array, label: Uint8Array, w: number, h: number, steps: number) {
  for (let s = 0; s < steps; s++) {
    const m = mask.slice(), l = label.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (m[i]) continue;
        const n = x > 0 && m[i - 1] ? i - 1 : x < w - 1 && m[i + 1] ? i + 1 : y > 0 && m[i - w] ? i - w : y < h - 1 && m[i + w] ? i + w : -1;
        if (n >= 0) {
          mask[i] = 1;
          label[i] = l[n];
        }
      }
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const hexToRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const dist2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const luminance = ([r, g, b]: RGB) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
// Polyester thread reads a little less saturated than screen/ink color
const threadTone = (c: RGB, k = 0.1): RGB => {
  const l = luminance(c) * 255;
  return [c[0] + (l - c[0]) * k, c[1] + (l - c[1]) * k, c[2] + (l - c[2]) * k];
};
const shade = ([r, g, b]: RGB, f: number) => {
  // f > 0 lightens toward white, f < 0 darkens toward black
  const t = f > 0 ? 255 : 0;
  const k = Math.abs(f);
  return `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`;
};

/** Which pixels belong to the logo: real transparency if the file has it, else "not the background color" */
/** Every non-transparent pixel */
function alphaMask(data: Uint8ClampedArray, n: number) {
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  return mask;
}

function logoMask(data: Uint8ClampedArray, w: number, h: number) {
  const n = w * h;
  const mask = new Uint8Array(n);
  let transparent = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 200) transparent++;
  if (transparent > n * 0.02) {
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
    return mask;
  }
  // Opaque file (JPEG etc.): the background is whatever color the corners share
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map((i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]] as RGB);
  const bg: RGB = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / 4) as RGB;
  for (let i = 0; i < n; i++) {
    const p: RGB = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    mask[i] = dist2(p, bg) > 45 * 45 ? 1 : 0;
  }
  return mask;
}

/** Reduce the logo's colors to k thread colors (k-means, seeded from the most common colors) */
function threadPalette(data: Uint8ClampedArray, mask: Uint8Array, k: number): RGB[] {
  const counts = new Map<number, { n: number; c: RGB }>();
  const samples: RGB[] = [];
  const step = Math.max(1, Math.floor(mask.length / 20000));
  for (let i = 0; i < mask.length; i += step) {
    if (!mask[i]) continue;
    const c: RGB = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    samples.push(c);
    const key = ((c[0] >> 4) << 8) | ((c[1] >> 4) << 4) | (c[2] >> 4);
    const e = counts.get(key);
    if (e) e.n++;
    else counts.set(key, { n: 1, c });
  }
  if (!samples.length) return [[40, 40, 40]];
  // Seeds: most frequent colors that are clearly different from each other (skips anti-aliased edges)
  const seeds: RGB[] = [];
  for (const { c } of [...counts.values()].sort((a, b) => b.n - a.n)) {
    if (seeds.every((s) => dist2(s, c) > 60 * 60)) seeds.push(c);
    if (seeds.length === k) break;
  }
  let centers = seeds;
  for (let iter = 0; iter < 8; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      let best = 0;
      for (let j = 1; j < centers.length; j++) if (dist2(s, centers[j]) < dist2(s, centers[best])) best = j;
      sum[best][0] += s[0];
      sum[best][1] += s[1];
      sum[best][2] += s[2];
      sum[best][3]++;
    }
    centers = centers.map((c, j) => (sum[j][3] ? ([sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] as RGB) : c));
  }
  return centers;
}

// Tiny deterministic PRNG so the same logo always stitches the same way (no flicker on re-render)
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

export async function renderEmbroidery(src: string, opts: EmbroideryOptions): Promise<string> {
  const img = await loadImage(src);
  const W = Math.round(opts.width ?? 1000);
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));

  const read = document.createElement("canvas");
  read.width = W;
  read.height = H;
  const rctx = read.getContext("2d", { willReadFrequently: true })!;
  rctx.drawImage(img, 0, 0, W, H);
  const { data } = rctx.getImageData(0, 0, W, H);

  const mask = opts.keepBackground ? alphaMask(data, W * H) : logoMask(data, W, H);
  const palette = (opts.thread ? [hexToRgb(opts.thread)] : threadPalette(data, mask, Math.max(1, opts.maxColors))).map((c) =>
    threadTone(c)
  );
  const label = new Uint8Array(W * H);
  for (let i = 0; i < label.length; i++) {
    if (!mask[i]) continue;
    const p: RGB = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    let best = 0;
    for (let j = 1; j < palette.length; j++) if (dist2(p, palette[j]) < dist2(p, palette[best])) best = j;
    label[i] = best;
  }

  const pxPerCm = W / (opts.widthCm ?? 9);
  if (opts.thickenMm) dilate(mask, label, W, H, Math.round((opts.thickenMm / 10) * pxPerCm));

  // Thread spacing: ~0.5 mm per row at the logo's real size, but at least ~1/110 of the
  // width so individual stitches stay visible in the close-up preview
  const gap = Math.max(W / 240, pxPerCm * 0.04); // fine rows: read as satin sheen, not stripes
  const maxStitch = gap * 5; // tatami stitch length before the thread goes down and back up

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;

  // Underlay: flat, darker thread under everything so no fabric shows between stitches
  const under = ctx.createImageData(W, H);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const c = palette[label[i]];
    under.data[i * 4] = c[0] * 0.55;
    under.data[i * 4 + 1] = c[1] * 0.55;
    under.data[i * 4 + 2] = c[2] * 0.55;
    under.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(under, 0, 0);

  // Stitch rows run at angleDeg (45° unless the fabric's folds suggest otherwise): walk each
  // row, split it into runs of one thread color, then lay stitches along each run (staggered
  // row to row like a tatami fill).
  const rand = rng(W * 31 + H);
  const ang = ((opts.angleDeg ?? 45) * Math.PI) / 180;
  const dx = Math.cos(ang), dy = Math.sin(ang); // along the stitch
  const nx = -dy, ny = dx; // across rows
  const span = W + H;
  ctx.lineCap = "round";
  let row = 0;
  for (let off = -span; off <= span; off += gap, row++) {
    const ox = W / 2 + nx * off, oy = H / 2 + ny * off;
    // Position along the row where the current color run began (NaN: not in a run; t can be negative)
    let runStart = NaN, runLabel = -1;
    const flush = (endT: number) => {
      if (Number.isNaN(runStart)) return;
      const len = endT - runStart;
      if (len >= 1) {
        const c = palette[runLabel];
        // Short runs are one satin stitch across; long ones are split into staggered stitches
        const pieces = len <= maxStitch * 1.4 ? 1 : Math.round(len / maxStitch);
        const stagger = pieces > 1 ? ((row % 3) / 3) * (len / pieces) : 0;
        let a = runStart;
        for (let p = 0; p < pieces; p++) {
          let b = p === pieces - 1 ? endT : runStart + stagger + ((p + 1) * len) / pieces;
          b = Math.min(b, endT);
          if (b - a >= 0.5) drawStitch(a, b, c);
          a = b;
        }
      }
      runStart = NaN;
    };
    const line = (x1: number, y1: number, x2: number, y2: number, style: string, width: number) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    const drawStitch = (a: number, b: number, c: RGB) => {
      const j = () => (rand() - 0.5) * gap * 0.25;
      const x1 = ox + dx * a + j(), y1 = oy + dy * a + j();
      const x2 = ox + dx * b + j(), y2 = oy + dy * b + j();
      const tone = (rand() - 0.5) * 0.05;
      // How far the lit side of a thread lifts toward white. Dark thread needs more: a black
      // stitch lightened by the same 20% as a red one stays black and the stitching vanishes.
      const sheen = 0.08 + (1 - luminance(c)) * 0.12;
      // Light comes from the top-left, so each thread's crown shifts that way (across the row)
      const hx = nx * gap * -0.2, hy = ny * gap * -0.2;
      // The crown is shorter than the stitch so its ends dip into the fabric
      const k = Math.min(0.22, (gap * 0.6) / Math.max(1, Math.hypot(x2 - x1, y2 - y1)));
      const ax = x1 + (x2 - x1) * k, ay = y1 + (y2 - y1) * k;
      const bx = x2 - (x2 - x1) * k, by = y2 - (y2 - y1) * k;
      // 1. Thread body, darker at its edges where it rolls away from the light
      line(x1, y1, x2, y2, shade(c, -0.08 + tone), gap * 1.05);
      // 2. Broad soft mid-tone
      line(x1 + hx * 0.4, y1 + hy * 0.4, x2 + hx * 0.4, y2 + hy * 0.4, shade(c, sheen * 0.35 + tone), gap * 0.66);
      // 3. Narrow bright crown: the polyester sheen
      line(ax + hx, ay + hy, bx + hx, by + hy, shade(c, sheen + tone), gap * 0.26);
    };
    for (let t = -span; t <= span; t += 0.7) {
      const x = Math.round(ox + dx * t), y = Math.round(oy + dy * t);
      const inside = x >= 0 && y >= 0 && x < W && y < H;
      const i = y * W + x;
      const l = inside && mask[i] ? label[i] : -1;
      if (l !== runLabel) {
        flush(t);
        if (l >= 0) runStart = t;
        runLabel = l;
      }
    }
    flush(span);
  }

  const canvas = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const maskCanvas = canvas();
  const maskData = ctx.createImageData(W, H);
  for (let i = 0; i < mask.length; i++) maskData.data[i * 4 + 3] = mask[i] ? 255 : 0;
  maskCanvas.getContext("2d")!.putImageData(maskData, 0, 0);

  // Trim the spill from round caps and jitter, but against the outline grown by a fraction of
  // a stitch: the ragged stitch ends then form the edge instead of a crisp vector cut.
  const grown = canvas();
  const gctx = grown.getContext("2d")!;
  const r = gap * 0.35;
  for (const [ux, uy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]])
    gctx.drawImage(maskCanvas, ux * r, uy * r);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(grown, 0, 0);

  // Raised thread: a soft highlight inside the top-left edges and a dark band inside the
  // bottom-right ones, as if the whole fill were a slightly padded surface lit from the top-left.
  // Each band is "everything except the outline nudged toward the light", painted onto the
  // thread only (source-atop). The blur needs canvas filters (Chrome/Firefox); without them the
  // bands are just harder.
  const bevel = gap * 0.9;
  const edge = (color: string, shift: number, alpha: number) => {
    const band = canvas();
    const bctx = band.getContext("2d")!;
    bctx.fillStyle = color;
    bctx.fillRect(0, 0, W, H);
    bctx.globalCompositeOperation = "destination-out";
    bctx.drawImage(maskCanvas, shift, shift);
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = alpha;
    ctx.filter = `blur(${bevel * 0.6}px)`;
    ctx.drawImage(band, 0, 0);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
  };
  edge("#000", -bevel, 0.4); // outline nudged up-left leaves the bottom-right rim uncovered
  edge("#fff", bevel, 0.22); // nudged down-right leaves the top-left rim
  ctx.globalCompositeOperation = "source-over";

  // No shadow is baked in: the display adds it (CSS drop-shadow), so this image's alpha is
  // exactly the thread and can double as the mask for the fabric-shading overlay.
  return out.toDataURL("image/png");
}

const toHex = (c: RGB) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** The logo's main colors (up to 8), most common first, e.g. to show as color chips */
export async function logoPalette(src: string): Promise<string[]> {
  const img = await loadImage(src);
  const W = 200;
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  const mask = logoMask(data, W, H);
  return threadPalette(data, mask, 8)
    .filter((c, i, all) => all.findIndex((d) => dist2(c, d) < 50 * 50) === i)
    .map(toHex);
}

/** Typical thinnest stroke of the logo, in px. Each logo pixel's thickness is the shortest run
 * of logo pixels through it across 4 directions (diagonals count √2 per step), which is about
 * the width of the stroke it sits in. Taking a low percentile rather than the minimum keeps
 * stroke tips and anti-aliased corners (always 1–2 px) from flagging every logo. */
function thinStrokePx(mask: Uint8Array, w: number, h: number, percentile = 0.1): number {
  const thick = new Float32Array(w * h).fill(Infinity);
  // Walk one line of pixels (start, step, count) and give each pixel of every run its length
  const walk = (start: number, step: number, count: number, unit: number) => {
    let runStart = -1;
    for (let k = 0; k <= count; k++) {
      const on = k < count && mask[start + k * step];
      if (on && runStart < 0) runStart = k;
      if (!on && runStart >= 0) {
        const len = (k - runStart) * unit;
        for (let m = runStart; m < k; m++) {
          const i = start + m * step;
          if (len < thick[i]) thick[i] = len;
        }
        runStart = -1;
      }
    }
  };
  for (let y = 0; y < h; y++) walk(y * w, 1, w, 1);
  for (let x = 0; x < w; x++) walk(x, w, h, 1);
  // Diagonals: ↘ from the top row and left column, ↙ from the top row and right column
  for (let x = 0; x < w; x++) walk(x, w + 1, Math.min(w - x, h), Math.SQRT2);
  for (let y = 1; y < h; y++) walk(y * w, w + 1, Math.min(w, h - y), Math.SQRT2);
  for (let x = 0; x < w; x++) walk(x, w - 1, Math.min(x + 1, h), Math.SQRT2);
  for (let y = 1; y < h; y++) walk(y * w + w - 1, w - 1, Math.min(w, h - y), Math.SQRT2);

  const values: number[] = [];
  for (let i = 0; i < thick.length; i++) if (mask[i]) values.push(thick[i]);
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length * percentile)];
}

/** Checks whether the logo has strokes/text thinner than embroidery machines can stitch
 * cleanly (~1.5 mm) at the size it'll actually be sewn. */
export async function checkStitchability(src: string, widthCm: number): Promise<{ minStrokeMm: number; tooFine: boolean }> {
  const img = await loadImage(src);
  const W = 600;
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  const mask = logoMask(data, W, H);
  const strokePx = thinStrokePx(mask, W, H);
  const mmPerPx = (widthCm * 10) / W;
  const minStrokeMm = strokePx * mmPerPx;
  return { minStrokeMm, tooFine: minStrokeMm > 0 && minStrokeMm < 1.5 };
}

/** The logo in a single color (monochrome / custom color prints), keeping its shape and edges */
export async function recolorLogo(src: string, hex: string, width = 1000): Promise<string> {
  const img = await loadImage(src);
  const W = width;
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H);
  const mask = logoMask(id.data, W, H);
  const [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < mask.length; i++) {
    id.data[i * 4] = r;
    id.data[i * 4 + 1] = g;
    id.data[i * 4 + 2] = b;
    // Transparent files keep their own (soft-edged) alpha; opaque ones use the background cut-out
    const alpha = id.data[i * 4 + 3];
    id.data[i * 4 + 3] = alpha < 255 ? alpha : mask[i] ? 255 : 0;
  }
  ctx.putImageData(id, 0, 0);
  return c.toDataURL("image/png");
}

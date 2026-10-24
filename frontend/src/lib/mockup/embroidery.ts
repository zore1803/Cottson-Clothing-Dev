// Renders a customer's logo as embroidery (or flat print) for the zoomed fabric close-up.
// Pure functions over typed arrays, no DOM, so the same code runs in the browser and in Node for
// offline checks (components/fabric-detail.tsx feeds it canvas pixels).
//
// The embroidery is built the way real satin stitching looks, not as a texture stamped on the logo:
//   - the logo is reduced to a few thread colours (thread cannot do gradients)
//   - parallel threads run across the letters, each lit like a little cylinder, with its own
//     brightness and stitch breaks along its length
//   - a height map (the logo's own shape, softened) lights the raised edges from the upper left
//   - the outline is slightly ragged like thread ends, and sits in a contact shadow with the cloth
//     pressed down around it
//   - the fabric's own folds and weave show through the thread
// Print is flat ink soaked into the weave: no relief, no shadow.

export type CloseupFinish = "embroidery" | "print";

export type CloseupOptions = {
  /** Output is a square of this many pixels (the fabric photo is 1024) */
  size: number;
  /** Largest box the logo may fill, in output px */
  boxW: number;
  boxH: number;
  /** Rotation of the logo to follow the weave, degrees clockwise */
  angleDeg: number;
  finish: CloseupFinish;
  /** Overall thread brightness, 1 = as uploaded. Slightly below 1 on dark cloth so the thread does not glow. */
  brightness?: number;
  /** The fabric photo's luminance, 0..1, size × size. Gives the thread the cloth's lighting and weave. */
  fabric?: Float32Array | null;
};

export type CloseupResult = {
  /** Straight (non-premultiplied) RGBA, size × size: thread or ink with its shadow */
  rgba: Uint8ClampedArray;
  /** Thread colours used, as hex, most area first */
  palette: string[];
  /** False when the image had nothing to draw */
  empty: boolean;
};

// ---- small helpers --------------------------------------------------------------------

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Deterministic hash → [0, 1) */
function hash2(a: number, b: number) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function boxBlurAxis(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h, lines = horizontal ? h : w;
  const stride = horizontal ? 1 : w, step = horizontal ? w : 1;
  const inv = 1 / (2 * r + 1);
  for (let l = 0; l < lines; l++) {
    const base = l * step;
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += src[base + Math.min(len - 1, Math.max(0, i)) * stride];
    for (let i = 0; i < len; i++) {
      dst[base + i * stride] = acc * inv;
      acc += src[base + Math.min(len - 1, i + r + 1) * stride] - src[base + Math.max(0, i - r) * stride];
    }
  }
}

/** Gaussian blur approximated by three box blurs: O(pixels) whatever the sigma */
function gauss(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  if (sigma < 0.3) return new Float32Array(src);
  const n = 3;
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  const a: Float32Array = new Float32Array(src), b: Float32Array = new Float32Array(src.length);
  for (let i = 0; i < n; i++) {
    const r = ((i < m ? wl : wu) - 1) / 2;
    boxBlurAxis(a, b, w, h, Math.max(0, r), true);
    boxBlurAxis(b, a, w, h, Math.max(0, r), false);
  }
  return a;
}

/** Value noise at a given cell size, 0..1 */
function noise(x: number, y: number, cell: number, seed: number) {
  const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(ix + seed, iy), b = hash2(ix + 1 + seed, iy), c = hash2(ix + seed, iy + 1), d = hash2(ix + 1 + seed, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ---- logo preparation ------------------------------------------------------------------

type Prepared = { w: number; h: number; alpha: Float32Array; rgb: Float32Array; x0: number; y0: number; cw: number; ch: number };

/**
 * Logo pixels → alpha + colour. Transparent logos keep their alpha. An opaque image (a JPG, or a PNG
 * on a solid background) has its background removed, so only the artwork gets stitched.
 */
function prepareLogo(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Prepared {
  const n = w * h;
  const alpha = new Float32Array(n), rgb = new Float32Array(n * 3);
  let translucent = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 250) translucent++;
  const hasAlpha = translucent > n * 0.01;
  if (hasAlpha) {
    for (let i = 0; i < n; i++) {
      alpha[i] = rgba[i * 4 + 3] / 255;
      for (let c = 0; c < 3; c++) rgb[i * 3 + c] = rgba[i * 4 + c];
    }
  } else {
    // background = the median colour around the border
    const px: number[][] = [[], [], []];
    const take = (x: number, y: number) => { for (let c = 0; c < 3; c++) px[c].push(rgba[(y * w + x) * 4 + c]); };
    for (let x = 0; x < w; x += 2) { take(x, 0); take(x, h - 1); }
    for (let y = 0; y < h; y += 2) { take(0, y); take(w - 1, y); }
    const bg = px.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(rgba[i * 4] - bg[0], rgba[i * 4 + 1] - bg[1], rgba[i * 4 + 2] - bg[2]) / 441;
      alpha[i] = smoothstep(0.035, 0.16, d);
      for (let c = 0; c < 3; c++) rgb[i * 3 + c] = rgba[i * 4 + c];
    }
  }
  // content box: the solid artwork, ignoring faint halos and stray specks (a few stray pixels must not shrink the logo)
  const colMass = new Float64Array(w), rowMass = new Float64Array(h);
  let mass = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[y * w + x] > 0.5) { colMass[x]++; rowMass[y]++; mass++; }
  if (!mass) return { w, h, alpha, rgb, x0: 0, y0: 0, cw: 0, ch: 0 };
  const trim = Math.max(1, Math.floor(mass * 0.0005));
  const edge = (m: Float64Array, fromEnd: boolean) => {
    let acc = 0;
    for (let k = 0; k < m.length; k++) { const i = fromEnd ? m.length - 1 - k : k; acc += m[i]; if (acc >= trim) return i; }
    return fromEnd ? m.length - 1 : 0;
  };
  const x0 = edge(colMass, false), x1 = edge(colMass, true), y0 = edge(rowMass, false), y1 = edge(rowMass, true);
  return { w, h, alpha, rgb, x0, y0, cw: x1 - x0 + 1, ch: y1 - y0 + 1 };
}

/**
 * The thread colours: the artwork's solid pixels reduced to a few distinct colours. Starts from the most
 * common colour, then keeps adding the colour furthest from those already chosen (so a small dark detail or a
 * gold highlight is not averaged into the big orange area, as median cut would do), then settles each colour
 * onto the pixels nearest to it.
 */
function thinPalette(p: Prepared, maxColours: number, mergeDist: number): { colours: number[][]; share: number[] } {
  // 16 levels per channel; each bin keeps its pixel count and mean colour
  const count = new Float64Array(4096), sum = new Float64Array(4096 * 3);
  let total = 0;
  const step = Math.max(1, Math.floor(Math.sqrt((p.cw * p.ch) / 40000)));
  for (let y = p.y0; y < p.y0 + p.ch; y += step)
    for (let x = p.x0; x < p.x0 + p.cw; x += step) {
      const i = y * p.w + x;
      if (p.alpha[i] <= 0.7) continue;
      const r = p.rgb[i * 3], g = p.rgb[i * 3 + 1], b = p.rgb[i * 3 + 2];
      const bin = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      count[bin]++; sum[bin * 3] += r; sum[bin * 3 + 1] += g; sum[bin * 3 + 2] += b; total++;
    }
  if (!total) return { colours: [[0, 0, 0]], share: [1] };
  const bins: { c: number[]; n: number }[] = [];
  for (let k = 0; k < 4096; k++) if (count[k] > 0) bins.push({ c: [sum[k * 3] / count[k], sum[k * 3 + 1] / count[k], sum[k * 3 + 2] / count[k]], n: count[k] });
  const dist = (u: number[], v: number[]) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]);
  // a colour has to cover a visible amount of the logo to earn a thread (stray anti-aliasing pixels do not)
  const minShare = total * 0.004;
  const seeds: number[][] = [bins.reduce((m, b) => (b.n > m.n ? b : m)).c];
  while (seeds.length < maxColours) {
    let best: number[] | null = null, bestD = mergeDist;
    for (const b of bins) {
      if (b.n < minShare) continue;
      const d = Math.min(...seeds.map((s) => dist(s, b.c)));
      if (d > bestD) { bestD = d; best = b.c; }
    }
    if (!best) break;
    seeds.push(best);
  }
  // settle: a few rounds of nearest-colour averaging
  let centres = seeds;
  for (let round = 0; round < 4; round++) {
    const acc = centres.map(() => ({ s: [0, 0, 0], n: 0 }));
    for (const b of bins) {
      let bi = 0, bd = Infinity;
      centres.forEach((c, k) => { const d = dist(c, b.c); if (d < bd) { bd = d; bi = k; } });
      for (let c = 0; c < 3; c++) acc[bi].s[c] += b.c[c] * b.n;
      acc[bi].n += b.n;
    }
    centres = centres.map((c, k) => (acc[k].n ? acc[k].s.map((v) => v / acc[k].n) : c));
  }
  const share = centres.map((c) => bins.reduce((n, b) => n + (dist(c, b.c) === Math.min(...centres.map((o) => dist(o, b.c))) ? b.n : 0), 0) / total);
  return { colours: centres.map((c) => c.map(Math.round)), share };
}

// ---- stitching constants ---------------------------------------------------------------

/** One knit loop of the fabric photo is about 24 px wide (counted on the photo); thread is a third of that */
const LOOP_PX = 24;
const PITCH = LOOP_PX / 3;
/** A shape thinner than this many threads cannot be stitched, so it is dropped */
const MIN_FEATURE_THREADS = 2;
/** Colour regions wider than this many threads are filled tatami-style (brick rows); narrower ones are satin */
const TATAMI_MIN_THREADS = 7;

// ---- geometry helpers ------------------------------------------------------------------

/** Distance in px from every pixel to the nearest pixel where `zero` is 1 (chamfer, two passes) */
function distanceTo(zero: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h), D = Math.SQRT2;
  for (let i = 0; i < d.length; i++) d[i] = zero[i] ? 0 : 1e9;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 1);
        if (x > 0) v = Math.min(v, d[i - w - 1] + D);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + D);
      }
      d[i] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 1);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + D);
        if (x > 0) v = Math.min(v, d[i + w - 1] + D);
      }
      d[i] = v;
    }
  return d;
}

/** Connected regions of one thread colour (4-connected). Label 0 is "no thread". */
function labelRegions(alpha: Float32Array, col: Uint8Array, w: number, h: number) {
  const N = w * h, label = new Int32Array(N), stack = new Int32Array(N);
  let count = 0;
  for (let s = 0; s < N; s++) {
    if (label[s] || alpha[s] <= 0.5) continue;
    count++;
    const c = col[s];
    let top = 0;
    stack[top++] = s;
    label[s] = count;
    while (top) {
      const i = stack[--top], x = i % w, y = (i - x) / w;
      const visit = (j: number) => {
        if (!label[j] && alpha[j] > 0.5 && col[j] === c) { label[j] = count; stack[top++] = j; }
      };
      if (x > 0) visit(i - 1);
      if (x < w - 1) visit(i + 1);
      if (y > 0) visit(i - w);
      if (y < h - 1) visit(i + w);
    }
  }
  return { label, count };
}

/** Remove shapes narrower than `radius * 2` (a morphological opening): thin lines and specks that no thread could follow */
function dropThinFeatures(alpha: Float32Array, w: number, h: number, radius: number) {
  const N = w * h, outside = new Uint8Array(N);
  for (let i = 0; i < N; i++) outside[i] = alpha[i] > 0.5 ? 0 : 1;
  const inner = distanceTo(outside, w, h);
  const core = new Uint8Array(N);
  for (let i = 0; i < N; i++) core[i] = inner[i] > radius ? 1 : 0;
  const reach = distanceTo(core, w, h);
  for (let i = 0; i < N; i++) if (reach[i] > radius + 1.5) alpha[i] = 0;
}

/** Give every `fillMask` pixel the colour of the nearest `source` pixel (flooding outwards from the source) */
function floodColour(col: Uint8Array, source: Uint8Array, fillMask: Uint8Array, w: number, h: number) {
  const N = w * h, queue = new Int32Array(N), done = new Uint8Array(N);
  let head = 0, tail = 0;
  const near = (i: number) => {
    const x = i % w, y = (i - x) / w;
    return [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
  };
  for (let i = 0; i < N; i++) {
    if (!source[i]) continue;
    for (const j of near(i)) if (j >= 0 && fillMask[j] && !source[j]) { queue[tail++] = i; break; }
  }
  while (head < tail) {
    const i = queue[head++];
    for (const j of near(i)) {
      if (j < 0 || !fillMask[j] || source[j] || done[j]) continue;
      col[j] = col[i];
      done[j] = 1;
      queue[tail++] = j;
    }
  }
}

/** Long-axis angle and elongation (long / short) of every labelled region, from its second moments */
function regionShapes(label: Int32Array, count: number, w: number, h: number) {
  const n = new Float64Array(count + 1), sx = new Float64Array(count + 1), sy = new Float64Array(count + 1);
  const sxx = new Float64Array(count + 1), syy = new Float64Array(count + 1), sxy = new Float64Array(count + 1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const l = label[y * w + x];
      if (!l) continue;
      n[l]++; sx[l] += x; sy[l] += y; sxx[l] += x * x; syy[l] += y * y; sxy[l] += x * y;
    }
  const angle = new Float32Array(count + 1), elongation = new Float32Array(count + 1), area = n;
  for (let l = 1; l <= count; l++) {
    if (!n[l]) continue;
    const mx = sx[l] / n[l], my = sy[l] / n[l];
    const cxx = sxx[l] / n[l] - mx * mx, cyy = syy[l] / n[l] - my * my, cxy = sxy[l] / n[l] - mx * my;
    const mean = (cxx + cyy) / 2, spread = Math.hypot((cxx - cyy) / 2, cxy);
    angle[l] = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    elongation[l] = Math.sqrt((mean + spread) / Math.max(1e-6, mean - spread));
  }
  return { angle, elongation, area };
}

/** Which regions touch which (4-neighbours) */
function touching(label: Int32Array, count: number, w: number, h: number) {
  const sets: Set<number>[] = Array.from({ length: count + 1 }, () => new Set<number>());
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, l = label[i];
      if (!l) continue;
      if (x < w - 1 && label[i + 1] && label[i + 1] !== l) { sets[l].add(label[i + 1]); sets[label[i + 1]].add(l); }
      if (y < h - 1 && label[i + w] && label[i + w] !== l) { sets[l].add(label[i + w]); sets[label[i + w]].add(l); }
    }
  return sets;
}

/**
 * The stitch direction at every pixel, as one of `bins` angles: across the local stroke (the direction of the
 * artwork's edges, from the structure tensor), or `fallbackBin` where the shape has no clear direction.
 */
function orientationBins(field: Float32Array, w: number, h: number, shapeSigma: number, tensorSigma: number, fallbackBin: number, bins: number) {
  const N = w * h, shape = gauss(field, w, h, shapeSigma);
  const gx2 = new Float32Array(N), gy2 = new Float32Array(N), gxy = new Float32Array(N);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, gx = (shape[i + 1] - shape[i - 1]) * 0.5, gy = (shape[i + w] - shape[i - w]) * 0.5;
      gx2[i] = gx * gx; gy2[i] = gy * gy; gxy[i] = gx * gy;
    }
  const Jxx = gauss(gx2, w, h, tensorSigma), Jyy = gauss(gy2, w, h, tensorSigma), Jxy = gauss(gxy, w, h, tensorSigma);
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const tr = Jxx[i] + Jyy[i];
    const coherence = tr > 1e-7 ? Math.hypot(Jxx[i] - Jyy[i], 2 * Jxy[i]) / tr : 0;
    if (coherence <= 0.3) { out[i] = fallbackBin; continue; }
    const ang = 0.5 * Math.atan2(2 * Jxy[i], Jxx[i] - Jyy[i]); // gradient = across the stroke = thread direction
    out[i] = Math.round((((ang % Math.PI) + Math.PI) % Math.PI) / (Math.PI / bins)) % bins;
  }
  return out;
}

// ---- the renderer ----------------------------------------------------------------------

export function renderCloseup(logoRgba: Uint8ClampedArray | Uint8Array, lw: number, lh: number, o: CloseupOptions): CloseupResult {
  const S = o.size, N = S * S;
  const empty: CloseupResult = { rgba: new Uint8ClampedArray(N * 4), palette: [], empty: true };
  const logo = prepareLogo(logoRgba, lw, lh);
  if (!logo.cw) return empty;
  const { colours } = thinPalette(logo, o.finish === "print" ? 8 : 7, o.finish === "print" ? 28 : 42);

  // place the logo: fit the box, centre, rotate; sample alpha + colour (bilinear), then snap colour to the palette
  const scale = Math.min(o.boxW / logo.cw, o.boxH / logo.ch);
  const rad = (o.angleDeg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const lcx = logo.x0 + logo.cw / 2, lcy = logo.y0 + logo.ch / 2, cx = S / 2, cy = S / 2;
  const A = new Float32Array(N), col = new Uint8Array(N); // alpha, palette index
  const sample = (x: number, y: number) => {
    const fx = Math.min(lw - 1.001, Math.max(0, x - 0.5)), fy = Math.min(lh - 1.001, Math.max(0, y - 0.5));
    const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
    const i00 = iy * lw + ix, i10 = i00 + 1, i01 = i00 + lw, i11 = i01 + 1;
    const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
    const a = logo.alpha[i00] * w00 + logo.alpha[i10] * w10 + logo.alpha[i01] * w01 + logo.alpha[i11] * w11;
    return { a, i00, i10, i01, i11, w00, w10, w01, w11 };
  };
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const lx = (dx * cos + dy * sin) / scale + lcx, ly = (-dx * sin + dy * cos) / scale + lcy;
      if (lx < logo.x0 - 1 || ly < logo.y0 - 1 || lx > logo.x0 + logo.cw + 1 || ly > logo.y0 + logo.ch + 1) continue;
      const s = sample(lx, ly);
      if (s.a < 0.01) continue;
      const i = y * S + x;
      A[i] = s.a;
      // colour: premultiplied bilinear, snapped to the nearest thread colour
      let r = 0, g = 0, b = 0, wsum = 0;
      for (const [idx, wt] of [[s.i00, s.w00], [s.i10, s.w10], [s.i01, s.w01], [s.i11, s.w11]] as const) {
        const wa = wt * logo.alpha[idx];
        r += logo.rgb[idx * 3] * wa; g += logo.rgb[idx * 3 + 1] * wa; b += logo.rgb[idx * 3 + 2] * wa; wsum += wa;
      }
      if (wsum > 0) { r /= wsum; g /= wsum; b /= wsum; }
      let bi = 0, bd = 1e9;
      for (let k = 0; k < colours.length; k++) {
        const d = (colours[k][0] - r) ** 2 + (colours[k][1] - g) ** 2 + (colours[k][2] - b) ** 2;
        if (d < bd) { bd = d; bi = k; }
      }
      col[i] = bi;
    }

  const out = new Uint8ClampedArray(N * 4);
  const bright = o.brightness ?? 1;

  // the cloth's lighting: folds (low frequency) and weave (high frequency), normalised around 1
  let fold: Float32Array | null = null, weave: Float32Array | null = null;
  if (o.fabric) {
    const low = gauss(o.fabric, S, S, 34);
    let mean = 0;
    for (let i = 0; i < N; i++) mean += low[i];
    mean /= N;
    fold = new Float32Array(N);
    for (let i = 0; i < N; i++) fold[i] = low[i] / mean;
    const mid = gauss(o.fabric, S, S, 3);
    weave = new Float32Array(N);
    for (let i = 0; i < N; i++) weave[i] = (o.fabric[i] - mid[i]) / Math.max(0.2, mean);
  }

  if (o.finish === "print") {
    // ink: soaks into the weave, so the cloth's texture shows through and the odd gap lets the fabric peek out
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = y * S + x, a0 = A[i];
        if (a0 <= 0) continue;
        const c = colours[col[i]];
        const wv = weave ? weave[i] : 0, fd = fold ? fold[i] : 1;
        const tex = clamp01(0.86 + wv * 2.6) * 0.7 + 0.3;
        const gap = smoothstep(-0.085, -0.03, wv); // deep weave gaps stay unprinted
        const a = clamp01(a0 * (0.9 + 0.1 * gap));
        for (let k = 0; k < 3; k++) out[i * 4 + k] = c[k] * tex * Math.pow(fd, 0.9) * bright;
        out[i * 4 + 3] = a * 255;
      }
    return { rgba: soften(out, S), palette: colours.map(hex), empty: false };
  }

  // ---- embroidery ----
  // Stitched in two layers, like a real digitised design: FILLS first (satin across narrow shapes, tatami in large
  // areas), then thin DETAILS (eyes, mouths, outlines, small text) as fine satin lines on top of them.

  // 1. Split off the details: anything narrower than two threads. Where a fill loses a detail it is filled in again with
  //    the colour round it, so the fill runs on underneath and the detail is stitched over it afterwards.
  const detailAlpha = Float32Array.from(A), detailCol = Uint8Array.from(col);
  const solidAll = new Uint8Array(N);
  for (let i = 0; i < N; i++) solidAll[i] = A[i] > 0.5 ? 1 : 0;
  dropThinFeatures(A, S, S, (PITCH * MIN_FEATURE_THREADS) / 2);
  const fill = new Uint8Array(N), detail = new Uint8Array(N);
  for (let i = 0; i < N; i++) { fill[i] = A[i] > 0.5 ? 1 : 0; detail[i] = solidAll[i] && !fill[i] ? 1 : 0; }
  const toFill = distanceTo(fill, S, S);
  const under = new Uint8Array(N); // thin features within reach of a fill: the fill continues beneath them
  for (let i = 0; i < N; i++) under[i] = detail[i] && toFill[i] <= PITCH * 1.7 ? 1 : 0;
  floodColour(col, fill, under, S, S);
  for (let i = 0; i < N; i++) if (under[i]) A[i] = detailAlpha[i];

  const regionDepth = (label: Int32Array) => {
    // distance to the edge of the pixel's own colour region
    const zero = new Uint8Array(N);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = y * S + x, l = label[i];
        zero[i] = !l || (x > 0 && label[i - 1] !== l) || (x < S - 1 && label[i + 1] !== l) || (y > 0 && label[i - S] !== l) || (y < S - 1 && label[i + S] !== l) ? 1 : 0;
      }
    return distanceTo(zero, S, S);
  };
  let { label, count } = labelRegions(A, col, S, S);
  let depth = regionDepth(label);
  // thin colour lines inside a fill (a dark mouth on an orange face) are details too
  {
    const reach = new Float32Array(count + 1);
    for (let i = 0; i < N; i++) if (label[i] && depth[i] > reach[label[i]]) reach[label[i]] = depth[i];
    const thinColour = new Uint8Array(N), fillSrc = new Uint8Array(N);
    let any = false;
    for (let i = 0; i < N; i++) {
      const l = label[i];
      if (!l) continue;
      if (reach[l] < PITCH) { thinColour[i] = 1; detail[i] = 1; detailCol[i] = col[i]; detailAlpha[i] = A[i]; any = true; }
      else fillSrc[i] = 1;
    }
    if (any) {
      floodColour(col, fillSrc, thinColour, S, S);
      ({ label, count } = labelRegions(A, col, S, S));
      depth = regionDepth(label);
    }
  }

  // keep details that are big enough to stitch (not the corner crumbs a fill leaves behind when thin parts are cut off)
  const detailField = new Float32Array(N);
  for (let i = 0; i < N; i++) detailField[i] = detail[i] ? detailAlpha[i] : 0;
  const dRegions = labelRegions(detailField, detailCol, S, S);
  {
    const size = new Int32Array(dRegions.count + 1);
    for (let i = 0; i < N; i++) if (dRegions.label[i]) size[dRegions.label[i]]++;
    for (let i = 0; i < N; i++) if (dRegions.label[i] && size[dRegions.label[i]] < 60) { detail[i] = 0; detailField[i] = 0; dRegions.label[i] = 0; }
  }

  // 2. Fill stitch type per colour region: satin across narrow shapes, tatami (brick rows) in large areas
  const widest = new Float32Array(count + 1);
  for (let i = 0; i < N; i++) if (label[i] && depth[i] > widest[label[i]]) widest[label[i]] = depth[i];
  const tatami = new Uint8Array(count + 1);
  for (let l = 1; l <= count; l++) tatami[l] = widest[l] >= (PITCH * TATAMI_MIN_THREADS) / 2 ? 1 : 0;

  const soft = gauss(A, S, S, 2.6); // height of the raised thread
  const edgeSoft = gauss(A, S, S, 0.9);
  const hx = new Float32Array(N), hy = new Float32Array(N);
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) { const i = y * S + x; hx[i] = (soft[i + 1] - soft[i - 1]) * 0.5; hy[i] = (soft[i + S] - soft[i - S]) * 0.5; }

  // Direction. Satin follows the shape (stitches run across each stroke). A tatami fill runs along its region's long
  // axis, or across it, and touching regions are given angles at least 30° apart.
  const BINS = 12;
  const fallback = ((o.angleDeg - 58) * Math.PI) / 180;
  const toBin = (ang: number) => Math.round((((ang % Math.PI) + Math.PI) % Math.PI) / (Math.PI / BINS)) % BINS;
  const cosB = new Float32Array(BINS), sinB = new Float32Array(BINS);
  for (let k = 0; k < BINS; k++) { cosB[k] = Math.cos((k * Math.PI) / BINS); sinB[k] = Math.sin((k * Math.PI) / BINS); }
  const satinBin = orientationBins(A, S, S, 3.2, 7, toBin(fallback), BINS);
  const shapes = regionShapes(label, count, S, S), next = touching(label, count, S, S);
  const tatamiBin = new Int16Array(count + 1).fill(-1);
  const order = Array.from({ length: count }, (_, k) => k + 1).filter((l) => tatami[l]).sort((a, b) => shapes.area[b] - shapes.area[a]);
  for (const l of order) {
    // long axis when the region is clearly elongated; otherwise a spread of angles by region
    const base = shapes.elongation[l] > 1.3 ? shapes.angle[l] : fallback + (l % 3) * (Math.PI / 3);
    let pick = toBin(base);
    for (const turn of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3]) {
      const b = toBin(base + turn);
      let ok = true;
      for (const m of next[l]) {
        const mb = tatamiBin[m];
        if (mb >= 0 && Math.min((b - mb + BINS) % BINS, (mb - b + BINS) % BINS) < 2) { ok = false; break; }
      }
      if (ok) { pick = b; break; }
    }
    tatamiBin[l] = pick;
  }
  const binOf = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const l = label[i];
    binOf[i] = l && tatami[l] ? tatamiBin[l] : satinBin[i];
  }

  // 3. Fill threads, each lit as a cylinder: bright along its middle, dark at its edges
  const thread = new Float32Array(N), alphaT = new Float32Array(N), tint = new Float32Array(N).fill(1);
  const cylinder = (u: number) => (0.66 + 0.4 * Math.pow(Math.sin(Math.PI * u), 1.1)) * (1 - 0.2 * (1 - smoothstep(0, 0.14, Math.min(u, 1 - u))));
  const OUTLINE = PITCH * 0.65; // one thin outline stitch round each tatami fill
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (edgeSoft[i] < 0.02 && A[i] <= 0) continue;
      const k = binOf[i], tc = cosB[k], ts = sinB[k], l = label[i], isTatami = l > 0 && tatami[l] === 1;
      const along = x * tc + y * ts, across = -x * ts + y * tc;
      const t = across / PITCH, n = Math.floor(t), u = t - n;
      const r1 = hash2(n + k * 1013, 7), r2 = hash2(n + k * 1013, 11);
      let b: number, r3: number;
      if (isTatami) {
        // brick rows of short stitches, each row shifted by a third of a stitch, with a faint dot where the needle goes in
        const segLen = PITCH * 3.6, shift = (((n % 3) + 3) % 3) * (segLen / 3);
        const seg = Math.floor((along + shift) / segLen), within = (along + shift) / segLen - seg;
        r3 = hash2(n * 31 + seg + k * 7919, 3);
        b = cylinder(u) * (0.94 + r1 * 0.08 + (r3 - 0.5) * 0.08);
        b *= 1 - 0.17 * (1 - smoothstep(0, 0.045, within)) - 0.17 * smoothstep(0.955, 1, within);
        if (depth[i] < OUTLINE) { b = cylinder(depth[i] / OUTLINE) * (0.96 + r1 * 0.06); tint[i] = 0.9; }
      } else {
        // satin: each stitch spans the full width of the stroke, so it only ends at the stroke's edge
        const segLen = 90 + r2 * 40, seg = Math.floor((along + r2 * 97) / segLen), within = (along + r2 * 97) / segLen - seg;
        r3 = hash2(n * 31 + seg + k * 7919, 3);
        b = cylinder(u) * (0.93 + r1 * 0.12 + (r3 - 0.5) * 0.1);
        b *= 1 - 0.12 * (1 - smoothstep(0, 0.05, within)) - 0.12 * smoothstep(0.95, 1, within);
      }
      // the soft gloss lives along each thread (patches that differ thread to thread), never across the whole shape
      const gloss = smoothstep(0.58, 0.92, noise(along, n * 97 + k * 31, 46, 3));
      thread[i] = b + Math.pow(Math.sin(Math.PI * u), 2) * gloss * 0.1;
      // ragged outline: thread ends zig-zag, each thread stopping a little short of or past its neighbour
      const rough = (noise(x, y, 1.7, 5) - 0.5) * 0.3 + (noise(x, y, 5, 9) - 0.5) * 0.16 + (r1 - 0.5) * 0.34 + (r3 - 0.5) * 0.12;
      const e = edgeSoft[i];
      alphaT[i] = smoothstep(0.4, 0.58, e + rough * (e > 0.03 && e < 0.97 ? 1 : 0.15));
    }

  // 4. Detail threads, stitched last: fine satin across a thin line, with a rounded ridge along it
  const DPITCH = PITCH * 0.55;
  const dEdge = gauss(detailField, S, S, 0.8);
  const dBin = orientationBins(detailField, S, S, 1.4, 3.5, toBin(fallback), BINS);
  const dZero = new Uint8Array(N);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x, l = dRegions.label[i];
      dZero[i] = !l || (x > 0 && dRegions.label[i - 1] !== l) || (x < S - 1 && dRegions.label[i + 1] !== l) || (y > 0 && dRegions.label[i - S] !== l) || (y < S - 1 && dRegions.label[i + S] !== l) ? 1 : 0;
    }
  const dDepth = distanceTo(dZero, S, S);
  const dReach = new Float32Array(dRegions.count + 1);
  for (let i = 0; i < N; i++) if (dRegions.label[i] && dDepth[i] > dReach[dRegions.label[i]]) dReach[dRegions.label[i]] = dDepth[i];
  const dThread = new Float32Array(N), alphaD = new Float32Array(N);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (dEdge[i] < 0.05) continue;
      const k = dBin[i], across = -x * sinB[k] + y * cosB[k];
      const t = across / DPITCH, n = Math.floor(t), u = t - n;
      const l = dRegions.label[i];
      const s = l ? Math.min(1, dDepth[i] / Math.max(2, dReach[l])) : 0;        // 0 at the line's edge, 1 along its middle
      const ridge = 0.6 + 0.45 * Math.pow(Math.sin((Math.PI / 2) * Math.min(1, s * 1.15)), 0.9);
      const rib = 1 - 0.22 * (1 - smoothstep(0, 0.2, Math.min(u, 1 - u)));      // the ribbing of the stitches across the line
      dThread[i] = ridge * rib * (0.94 + hash2(n + k * 211, 41) * 0.1);
      alphaD[i] = smoothstep(0.38, 0.56, dEdge[i] + (noise(x, y, 2.2, 23) - 0.5) * 0.12);
    }

  // thread colours
  const lit = (i: number, b: number) => {
    let v = b * bright;
    if (fold) v *= Math.pow(fold[i], 1.15);
    if (weave) v *= 1 + weave[i] * 0.4;
    return v;
  };
  const colour = new Float32Array(N * 3), detailColour = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    if (alphaT[i] > 0) {
      const c = colours[col[i]] ?? colours[0];
      const emb = (0.6 * hx[i] + 0.8 * hy[i]) * 11; // lit from the upper left
      const b = lit(i, (thread[i] + emb * 0.45) * tint[i]);
      const sheen = Math.max(0, thread[i] - 1.02) * 0.7;
      for (let k = 0; k < 3; k++) {
        const base = c[k] * b;
        colour[i * 3 + k] = Math.max(0, Math.min(255, base + sheen * (255 - base) * 0.4));
      }
    }
    if (alphaD[i] > 0) {
      const c = colours[detailCol[i]] ?? colours[0];
      const b = lit(i, dThread[i]);
      for (let k = 0; k < 3; k++) detailColour[i * 3 + k] = Math.max(0, Math.min(255, c[k] * b));
    }
  }

  // 5. Compose. Stitching sits on the cloth with a tight shadow (1 px offset, small blur) and a hint of puckering at its edge.
  const shiftBlur = (src: Float32Array, dx: number, dy: number, sigma: number) => {
    const s = new Float32Array(N);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const xx = x - dx, yy = y - dy; if (xx >= 0 && yy >= 0 && xx < S && yy < S) s[y * S + x] = src[yy * S + xx]; }
    return gauss(s, S, S, sigma);
  };
  const cover = new Float32Array(N); // how much of each pixel has thread on it, fill or detail
  for (let i = 0; i < N; i++) cover[i] = alphaT[i] + alphaD[i] - alphaT[i] * alphaD[i];
  const tight = shiftBlur(cover, 1, 1, 1.0), tightDetail = shiftBlur(alphaD, 1, 1, 0.8);
  const onThread = new Uint8Array(N);
  for (let i = 0; i < N; i++) onThread[i] = cover[i] > 0.5 ? 1 : 0;
  const away = distanceTo(onThread, S, S); // px from the nearest stitched pixel
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x, aT = alphaT[i], aD = alphaD[i], at = cover[i];
      let shadow = tight[i] * 0.55;
      // puckering: the cloth is drawn in right at the stitch (dark), then bulges up just beyond it (a faint light ridge)
      const dOut = away[i];
      if (dOut > 0 && dOut <= 2.2) shadow = 1 - (1 - shadow) * (1 - 0.2 * (1 - smoothstep(0, 2.2, dOut)));
      let ridge = 0;
      if (dOut > 2.2 && dOut < 6) ridge = 0.08 * Math.sin((Math.PI * (dOut - 2.2)) / 3.8) * (0.6 + 0.4 * noise(x, y, 6, 17));
      const a1 = ridge + shadow * (1 - ridge); // cloth layer: shadow (black) with the ridge (white) over it
      const c1 = 255 * ridge;
      const aOut = at + a1 * (1 - at);
      if (aOut <= 0.002) continue;
      // detail over fill: the fill is a little darker right next to a detail (its own tight shadow)
      const under = 1 - 0.4 * tightDetail[i] * (1 - aD);
      for (let k = 0; k < 3; k++) {
        const thr = at > 0.0001 ? (colour[i * 3 + k] * under * aT * (1 - aD) + detailColour[i * 3 + k] * aD) / at : 0;
        out[i * 4 + k] = (thr * at + c1 * (1 - at)) / aOut;
      }
      out[i * 4 + 3] = aOut * 255;
    }
  return { rgba: soften(out, S), palette: colours.map(hex), empty: false };
}

const hex = (c: number[]) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** A half-pixel softening (premultiplied, so edges do not fringe) so the logo shares the photo's soft focus */
function soften(rgba: Uint8ClampedArray, S: number): Uint8ClampedArray {
  const N = S * S, mix = 0.55;
  const ch = [0, 1, 2, 3].map((c) => {
    const f = new Float32Array(N);
    for (let i = 0; i < N; i++) f[i] = c === 3 ? rgba[i * 4 + 3] : (rgba[i * 4 + c] * rgba[i * 4 + 3]) / 255;
    return f;
  });
  const tmp = new Float32Array(N), blurred = ch.map((f) => {
    const o = new Float32Array(N);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x; tmp[i] = (f[y * S + Math.max(0, x - 1)] + 2 * f[i] + f[y * S + Math.min(S - 1, x + 1)]) / 4; }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x; o[i] = (tmp[Math.max(0, y - 1) * S + x] + 2 * tmp[i] + tmp[Math.min(S - 1, y + 1) * S + x]) / 4; }
    return o;
  });
  const out = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    const a = ch[3][i] * (1 - mix) + blurred[3][i] * mix;
    if (a < 0.5) continue;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = ((ch[c][i] * (1 - mix) + blurred[c][i] * mix) * 255) / a;
    out[i * 4 + 3] = a;
  }
  return out;
}

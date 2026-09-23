// One-off: segments the garment out of a composited product photo and writes a
// grayscale+alpha "garment-layer.png" for the overlay-blend recolor engine (see
// src/lib/recolor-shader.ts). Same segmentation model as prepare-product.mjs, but the
// output format matches the new pipeline (no mask.png/meta.json).
//
//   node scripts/make-garment-layer.mjs <photo.png> <outDir>

import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { pipeline, RawImage } from '@huggingface/transformers';

const [photoPath, outDir] = process.argv.slice(2);
if (!photoPath || !outDir) {
  console.error('Usage: node scripts/make-garment-layer.mjs <photo.png> <outDir>');
  process.exit(1);
}

const toLin = (v) => Math.pow(v / 255, 2.2);
function toLab(r, g, b) {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const labDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];

const { data: rgb, info } = await sharp(photoPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, n = W * H;
console.log(`Photo ${W}x${H}`);

console.log('Segmenting clothes (first run downloads the model)…');
const segment = await pipeline('image-segmentation', 'Xenova/segformer_b2_clothes');
const image = new RawImage(new Uint8ClampedArray(rgb), W, H, 3);
const results = await segment(image);

function maskOf(labels) {
  const m = new Uint8Array(n);
  for (const r of results) {
    if (!labels.includes(r.label)) continue;
    const mk = r.mask;
    for (let y = 0; y < H; y++) {
      const my = Math.min(mk.height - 1, Math.floor((y * mk.height) / H));
      for (let x = 0; x < W; x++) {
        const mx = Math.min(mk.width - 1, Math.floor((x * mk.width) / W));
        if (mk.data[my * mk.width + mx] > 127) m[y * W + x] = 1;
      }
    }
  }
  return m;
}

function shrink(m, r) {
  let cur = m;
  for (let i = 0; i < r; i++) {
    const next = new Uint8Array(n);
    for (let p = W; p < n - W; p++) {
      const x = p % W;
      if (cur[p] && x > 0 && x < W - 1 && cur[p - 1] && cur[p + 1] && cur[p - W] && cur[p + W]) next[p] = 1;
    }
    cur = next;
  }
  return cur;
}
function fabricLab(m) {
  const L = [], A = [], B = [];
  for (let p = 0; p < n; p += 7) if (m[p]) { const lab = toLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]); L.push(lab[0]); A.push(lab[1]); B.push(lab[2]); }
  return L.length ? [median(L), median(A), median(B)] : null;
}
function refine(full) {
  const edge = Math.max(2, Math.round(W / 400));
  const core = shrink(full, edge);
  const lab = fabricLab(core);
  if (!lab) return core;
  for (let p = 0; p < n; p++) {
    if (full[p] && !core[p] && labDist(toLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]), lab) < 16) core[p] = 1;
  }
  return core;
}

// Fills small interior holes (a button, a deep shadow crease) the segmentation model
// misreads as non-fabric — without this, that spot skips recoloring entirely and shows
// the original photo's color through, standing out as a stray light/dark speck. Small
// radius so it doesn't bridge legitimate large gaps like the collar opening or a hand
// resting on the fabric.
function dilate(m, r) {
  let cur = m;
  for (let i = 0; i < r; i++) {
    const next = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      if (cur[p]) { next[p] = 1; continue; }
      const x = p % W;
      if ((x > 0 && cur[p - 1]) || (x < W - 1 && cur[p + 1]) || (p >= W && cur[p - W]) || (p < n - W && cur[p + W])) next[p] = 1;
    }
    cur = next;
  }
  return cur;
}
function erode(m, r) {
  let cur = m;
  for (let i = 0; i < r; i++) {
    const next = new Uint8Array(n);
    for (let p = W; p < n - W; p++) {
      const x = p % W;
      if (cur[p] && x > 0 && x < W - 1 && cur[p - 1] && cur[p + 1] && cur[p - W] && cur[p + W]) next[p] = 1;
    }
    cur = next;
  }
  return cur;
}
const closeGaps = (m, r) => erode(dilate(m, r), r);

// The segmentation model's own mask sometimes stops short of the garment's true edge — a
// sleeve hem or cuff band never gets included in the first place (not just eroded away),
// so refine()'s re-inclusion pass (which only restores pixels the raw mask already flagged)
// can't recover it. This instead searches outward from the confirmed fabric by color: any
// pixel within reach that's close in Lab to the fabric gets pulled in, regardless of what
// the raw model output said there.
function growByColor(m, radius, threshold) {
  const zone = dilate(m, radius);
  const lab = fabricLab(m);
  if (!lab) return m;
  const out = new Uint8Array(m);
  for (let p = 0; p < n; p++) {
    if (zone[p] && !out[p] && labDist(toLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]), lab) < threshold) out[p] = 1;
  }
  return out;
}

const top = closeGaps(growByColor(refine(maskOf(['Upper-clothes', 'Dress'])), 15, 18), 5);
let coverage = 0;
for (let p = 0; p < n; p++) coverage += top[p];
console.log(`garment coverage: ${((coverage / n) * 100).toFixed(1)}% of image`);
if (coverage < n * 0.02) throw new Error('Segmentation found almost no garment — refusing to write a near-empty layer.');

// alpha = mask (feathered by the PNG's own antialiasing after a blur), R=G=B = the photo's
// own grayscale luminance at that pixel (the "shading" the live shader will recolor)
const alphaMask = Buffer.alloc(n);
for (let p = 0; p < n; p++) alphaMask[p] = top[p] ? 255 : 0;
// sharp's raw() output on a blurred single-channel buffer comes back 3-channel-expanded, not
// 1-channel — extractChannel(0) forces a true single-channel buffer so indexing by pixel is safe
const feathered = await sharp(alphaMask, { raw: { width: W, height: H, channels: 1 } })
  .blur(1.2)
  .extractChannel(0)
  .raw()
  .toBuffer();

const out = Buffer.alloc(n * 4);
for (let p = 0; p < n; p++) {
  const g = Math.round(0.2126 * rgb[p * 3] + 0.7152 * rgb[p * 3 + 1] + 0.0722 * rgb[p * 3 + 2]);
  out[p * 4] = g;
  out[p * 4 + 1] = g;
  out[p * 4 + 2] = g;
  out[p * 4 + 3] = feathered[p];
}

await fs.mkdir(outDir, { recursive: true });
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(outDir, 'garment-layer.png'));
console.log('Wrote', path.join(outDir, 'garment-layer.png'));

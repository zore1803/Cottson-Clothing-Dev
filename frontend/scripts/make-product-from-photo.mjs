// One-off: for a real photo (with its own background, not a transparent cutout), segments
// the person out for a clean studio-grey composite, and separately segments the garment for
// the overlay-blend recolor engine's garment-layer.png. Writes model-photo.png,
// garment-layer.png, and photo.jpg into outDir.
//
//   node scripts/make-product-from-photo.mjs <photo.png> <outDir> [backdropHex]

import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { pipeline, RawImage } from '@huggingface/transformers';

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

const [photoPath, outDir, backdropHexArg = 'bac1c5'] = process.argv.slice(2);
if (!photoPath || !outDir) {
  console.error('Usage: node scripts/make-product-from-photo.mjs <photo.png> <outDir> [backdropHex]');
  process.exit(1);
}
const backdropHex = backdropHexArg.replace(/^#/, '');
const backdrop = [0, 2, 4].map((i) => parseInt(backdropHex.slice(i, i + 2), 16));

const { data: rgb, info } = await sharp(photoPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, n = W * H;
console.log(`Photo ${W}x${H}`);

console.log('Segmenting (first run downloads the model)…');
const segment = await pipeline('image-segmentation', 'Xenova/segformer_b2_clothes');
const image = new RawImage(new Uint8ClampedArray(rgb), W, H, 3);
const results = await segment(image);
console.log('labels found:', results.map((r) => r.label).join(', '));

// Person mask = union of every label except Background
function personMask() {
  const m = new Uint8Array(n);
  for (const r of results) {
    if (r.label === 'Background') continue;
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
function garmentMask(labels) {
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

// Fills small holes in the person silhouette (e.g. a narrow, dark armpit gap the coarse
// segmentation model misreads as background) so the composite doesn't show a background
// smudge through a gap that should just read as shadow between the arm and torso.
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

function fabricLab(m) {
  const L = [], A = [], B = [];
  for (let p = 0; p < n; p += 7) if (m[p]) { const lab = toLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]); L.push(lab[0]); A.push(lab[1]); B.push(lab[2]); }
  return L.length ? [median(L), median(A), median(B)] : null;
}
// The segmentation model's own mask sometimes stops short of the garment's true edge (a
// sleeve hem or cuff band never gets included in the first place). This searches outward
// from the confirmed fabric by color: any pixel within reach that's close in Lab to the
// fabric gets pulled in, regardless of what the raw model output said there.
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

const person = closeGaps(personMask(), 6);
let personCov = 0;
for (let p = 0; p < n; p++) personCov += person[p];
console.log(`person coverage: ${((personCov / n) * 100).toFixed(1)}%`);
if (personCov < n * 0.1) throw new Error('Segmentation found almost no person — refusing to proceed.');

const top = closeGaps(growByColor(garmentMask(['Upper-clothes', 'Dress']), 15, 18), 5);
let topCov = 0;
for (let p = 0; p < n; p++) topCov += top[p];
console.log(`garment coverage: ${((topCov / n) * 100).toFixed(1)}%`);
if (topCov < n * 0.02) throw new Error('Segmentation found almost no garment — refusing to write a near-empty layer.');

// ---- composite person onto flat backdrop ----
const personAlphaRaw = Buffer.alloc(n);
for (let p = 0; p < n; p++) personAlphaRaw[p] = person[p] ? 255 : 0;
const personAlpha = await sharp(personAlphaRaw, { raw: { width: W, height: H, channels: 1 } })
  .blur(1.5)
  .extractChannel(0)
  .raw()
  .toBuffer();

const composed = Buffer.alloc(n * 3);
for (let p = 0; p < n; p++) {
  const a = personAlpha[p] / 255;
  for (let ch = 0; ch < 3; ch++) {
    composed[p * 3 + ch] = Math.round(rgb[p * 3 + ch] * a + backdrop[ch] * (1 - a));
  }
}
await fs.mkdir(outDir, { recursive: true });
await sharp(composed, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(outDir, 'model-photo.png'));
await sharp(composed, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 90 }).toFile(path.join(outDir, 'photo.jpg'));
console.log('Wrote model-photo.png and photo.jpg');

// ---- garment layer: grayscale luminance of the (original, uncomposited) photo, alpha = garment mask ----
// Pull the alpha edge a couple of pixels INSIDE the garment before feathering: the raw
// segmentation edge tends to include a rim of bright background pixels, which light up as a
// speckled halo once the garment is recolored. Eroding first keeps the recolor strictly on
// real fabric so the border stays clean.
const EDGE_TRIM = 3;
const topEdge = erode(top, EDGE_TRIM);
const topAlphaRaw = Buffer.alloc(n);
for (let p = 0; p < n; p++) topAlphaRaw[p] = topEdge[p] ? 255 : 0;
const topAlpha = await sharp(topAlphaRaw, { raw: { width: W, height: H, channels: 1 } })
  .blur(2.0)
  .extractChannel(0)
  .raw()
  .toBuffer();

const garmentOut = Buffer.alloc(n * 4);
for (let p = 0; p < n; p++) {
  const g = Math.round(0.2126 * rgb[p * 3] + 0.7152 * rgb[p * 3 + 1] + 0.0722 * rgb[p * 3 + 2]);
  garmentOut[p * 4] = g;
  garmentOut[p * 4 + 1] = g;
  garmentOut[p * 4 + 2] = g;
  garmentOut[p * 4 + 3] = topAlpha[p];
}
await sharp(garmentOut, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(outDir, 'garment-layer.png'));
console.log('Wrote garment-layer.png');

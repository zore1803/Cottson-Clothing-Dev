// Offline mask preparation: run once per product photo, never in the shopper's browser.
//
//   node scripts/prepare-product.mjs public/products/<slug>/photo.jpg
//
// Writes next to the photo:
//   mask.png   R = top (shirt/polo/hoodie), G = logo/print on the top (never recolored), B = trousers
//   meta.json  image size + shading stats per part, used by the PixiJS recolor shader
//
// This uses a clothing-segmentation model (SegFormer, via transformers.js on the CPU).
// In production the same outputs come from the Python SAM 2 worker on a GPU; the storefront
// only reads mask.png + meta.json, so the worker can be swapped without touching the site.

import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { pipeline, RawImage } from '@huggingface/transformers';

const photoPath = process.argv[2];
if (!photoPath) {
  console.error('Usage: node scripts/prepare-product.mjs <path/to/photo.jpg>');
  process.exit(1);
}
const outDir = path.dirname(photoPath);

// ---------- color helpers ----------
const toLin = v => Math.pow(v / 255, 2.2);
function toLab(r, g, b) {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const labDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const median = a => a.slice().sort((x, y) => x - y)[a.length >> 1];

// ---------- load photo ----------
const { data: rgb, info } = await sharp(photoPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, n = W * H;
console.log(`Photo ${W}x${H}`);

// ---------- segment clothes ----------
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

// The model's masks run a pixel or two past the garment: shrink them, then add back only
// the edge pixels whose color matches the fabric (the rest is background or skin)
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

const top = refine(maskOf(['Upper-clothes', 'Dress']));
const pants = refine(maskOf(['Pants', 'Skirt']));

// ---------- logos / embroidery on the top ----------
const topLab = fabricLab(top) || [50, 0, 0];
const print = new Uint8Array(n);
for (let p = 0; p < n; p++) {
  if (!top[p]) continue;
  const lab = toLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
  const d = Math.hypot((lab[0] - topLab[0]) * 0.55, lab[1] - topLab[1], lab[2] - topLab[2]);
  if (d > 38) print[p] = 1;
}
for (let p = W; p < n - W; p++) {   // drop isolated texture specks
  if (!print[p]) continue;
  let same = 0;
  for (const q of [p - 1, p + 1, p - W, p + W, p - W - 1, p - W + 1, p + W - 1, p + W + 1]) same += print[q];
  if (same < 3) print[p] = 0;
}
for (let p = 0; p < n; p++) if (print[p]) top[p] = 0;

// ---------- shading stats per part ----------
function stats(m) {
  const hist = new Uint32Array(512);
  let cnt = 0, minX = W, maxX = 0, minY = H, maxY = 0;
  for (let p = 0; p < n; p++) {
    if (!m[p]) continue;
    const x = p % W, y = (p / W) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    const L = 0.2126 * toLin(rgb[p * 3]) + 0.7152 * toLin(rgb[p * 3 + 1]) + 0.0722 * toLin(rgb[p * 3 + 2]);
    hist[Math.min(511, Math.floor(Math.pow(L, 1 / 2.2) * 512))]++;
    cnt++;
  }
  if (cnt < 500) return null;
  const pct = q => { let a = 0; for (let b = 0; b < 512; b++) { a += hist[b]; if (a >= cnt * q) return Math.pow((b + 0.5) / 512, 2.2); } return 1; };
  const avg = Math.max(pct(0.5), 0.004);
  const dark = avg < 0.05;                       // black/navy fabric: little shading, lots of grain
  const exp = dark ? 0.45 : 1.35;                // shading contrast used by the shader
  return {
    avg, dark, exp,
    peak: Math.min(Math.max(Math.pow(pct(0.97) / avg, exp), 1), 4),
    bbox: [minX, minY, maxX, maxY],
    coverage: cnt / n,
  };
}

const meta = {
  width: W,
  height: H,
  generatedBy: 'segformer_b2_clothes (transformers.js)',
  parts: { top: stats(top), print: stats(print), pants: stats(pants) },
};

// ---------- write outputs ----------
const maskBuf = Buffer.alloc(n * 3);
for (let p = 0; p < n; p++) {
  maskBuf[p * 3] = top[p] ? 255 : 0;
  maskBuf[p * 3 + 1] = print[p] ? 255 : 0;
  maskBuf[p * 3 + 2] = pants[p] ? 255 : 0;
}
await sharp(maskBuf, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'mask.png'));
await fs.writeFile(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
console.log('Wrote', path.join(outDir, 'mask.png'), 'and meta.json');
for (const [k, v] of Object.entries(meta.parts)) console.log(`  ${k}: ${v ? (v.coverage * 100).toFixed(1) + '% of image' : 'not found'}`);

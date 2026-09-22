// Pre-renders every catalog color of every product for listing / SEO pages.
//
//   node scripts/render-variants.mjs
//
// Reads photo.jpg + mask.png + meta.json (from prepare-product.mjs) and writes
// public/products/<slug>/variants/<colorId>.webp. The math is the same as the PixiJS
// shader in src/lib/recolor-shader.ts, so listing images match the live studio.
// In production this runs in a background worker and uploads to R2/S3 behind the CDN.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/data/products.json'), 'utf8'));
const colorHex = Object.fromEntries(catalog.colors.map((c) => [c.id, c.hex]));

const toLin = (v) => Math.pow(v / 255, 2.2);
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hexToLin = (h) => [1, 3, 5].map((i) => Math.max(toLin(parseInt(h.slice(i, i + 2), 16)), 0.006));

function colorParams(hex, part) {
  const T = hexToLin(hex);
  let head = Math.min(1, 0.98 / (Math.max(...T) * part.peak));
  head = head + (1 - head) * 0.6;
  const lumT = 0.2126 * T[0] + 0.7152 * T[1] + 0.0722 * T[2];
  return { T, head, darkT: 1 - smoothstep(0.02, 0.25, lumT) };
}

function boxBlur(a, W, H, r) {
  const tmp = new Float32Array(a.length), out = new Float32Array(a.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += a[y * W + xx]; c++; } }
    tmp[y * W + x] = s / c;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) { s += tmp[yy * W + x]; c++; } }
    out[y * W + x] = s / c;
  }
  return out;
}

for (const product of catalog.products) {
  const dir = path.join(root, 'public/products', product.slug);
  const meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf8'));
  const top = meta.parts.top;
  if (!top) { console.warn(`${product.slug}: no top mask, skipped`); continue; }

  const { data: rgb, info } = await sharp(path.join(dir, 'photo.jpg')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  // Feather the mask slightly so edges blend, as the browser does
  const { data: mask } = await sharp(path.join(dir, 'mask.png')).removeAlpha().blur(0.8).raw().toBuffer({ resolveWithObject: true });

  const lin = new Float32Array(n);
  for (let p = 0; p < n; p++) lin[p] = 0.2126 * toLin(rgb[p * 3]) + 0.7152 * toLin(rgb[p * 3 + 1]) + 0.0722 * toLin(rgb[p * 3 + 2]);
  const linSmooth = top.dark ? boxBlur(lin, W, H, 3) : lin;

  await fs.mkdir(path.join(dir, 'variants'), { recursive: true });
  for (const colorId of product.colors) {
    if (colorId === product.originalColor) continue;
    const P = colorParams(colorHex[colorId], top);
    const out = Buffer.alloc(n * 3);
    for (let p = 0; p < n; p++) {
      const w = mask[p * 3] / 255;   // R channel = top garment
      for (let ch = 0; ch < 3; ch++) {
        const orig = toLin(rgb[p * 3 + ch]);
        let v = orig;
        if (w > 0.003) {
          const s = Math.min(Math.pow(linSmooth[p] / top.avg, top.exp), 4);
          let c = P.T[ch] * P.head * s + P.darkT * (Math.max(s - 1, 0) * 0.035 + 0.004 * s);
          c = c / (1 + Math.max(c - 0.9, 0));
          v = orig + (c - orig) * w;
        }
        out[p * 3 + ch] = Math.round(Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2) * 255);
      }
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 86 }).toFile(path.join(dir, 'variants', `${colorId}.webp`));
    console.log(`${product.slug}/${colorId}.webp`);
  }
}

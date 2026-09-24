// Builds a garment-layer-style mask of just the green collar/sleeve trim stripe in
// public/mockup/polo-green.png, for live overlay-blend recoloring (see
// src/components/mockup-live-customizer.tsx). Detects the trim by its green hue
// (g significantly higher than r and b) rather than a hand-painted mask.
//
//   node scripts/make-collar-mask.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public/mockup/polo-green.png');
const out = path.join(root, 'public/mockup/polo-trim-mask.png');

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const mask = Buffer.alloc(W * H * 4);

for (let p = 0; p < W * H; p++) {
  const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2], a = data[p * 4 + 3];
  const isGreen = a > 10 && g > r + 20 && g > b + 20 && g > 90;
  const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  mask[p * 4] = lum;
  mask[p * 4 + 1] = lum;
  mask[p * 4 + 2] = lum;
  mask[p * 4 + 3] = isGreen ? 255 : 0;
}

await sharp(mask, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log('wrote', out);

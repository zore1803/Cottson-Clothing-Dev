// Pre-renders every catalog color of every product for listing / SEO pages.
//
//   node scripts/render-variants.mjs
//
// Reads model-photo.png + garment-layer.png (the same two assets the live overlay-blend
// PixiJS shader uses, src/lib/recolor-shader.ts) and writes
// public/products/<slug>/variants/<colorId>.webp so listing images match the live product
// page exactly. In production this runs in a background worker and uploads to R2/S3.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/data/products.json'), 'utf8'));
const colorHex = Object.fromEntries(catalog.colors.map((c) => [c.id, c.hex]));

const hexToNorm = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// Same overlay blend as the fragment shader — operated on plain sRGB bytes (no gamma
// linearization), since that's exactly what the GPU's texture sample gives it too.
function overlayBlend(colorNorm, g) {
  const low = 2 * colorNorm * g;
  const high = 1 - 2 * (1 - colorNorm) * (1 - g);
  return g < 0.5 ? low : high;
}

const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
// Same adaptive strength as the shader: colors far from mid-grey (black, white, saturated
// hues) need some flat color mixed in to actually read as that color on a photo whose own
// brightness sits far from that target; colors close to the original stay pure overlay.
const blendStrength = (colorNorm) => {
  const t = Math.abs(luminance(colorNorm) - 0.5) * 2;
  return 0.15 + (0.65 - 0.15) * t;
};

for (const product of catalog.products) {
  const dir = path.join(root, 'public/products', product.slug);
  const { data: base, info } = await sharp(path.join(dir, 'model-photo.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const { data: garment } = await sharp(path.join(dir, 'garment-layer.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  await fs.mkdir(path.join(dir, 'variants'), { recursive: true });
  for (const colorId of product.colors) {
    if (colorId === product.originalColor) continue;
    const colorNorm = hexToNorm(colorHex[colorId]);
    const strength = blendStrength(colorNorm);
    const out = Buffer.alloc(n * 3);
    for (let p = 0; p < n; p++) {
      const a = garment[p * 4 + 3] / 255;
      if (a <= 0.03) {
        out[p * 3] = base[p * 3];
        out[p * 3 + 1] = base[p * 3 + 1];
        out[p * 3 + 2] = base[p * 3 + 2];
        continue;
      }
      const g = 0.22 + 0.66 * (garment[p * 4] / 255); // matches mix(0.22, 0.88, g) in the shader
      for (let ch = 0; ch < 3; ch++) {
        const overlay = Math.min(1, Math.max(0, overlayBlend(colorNorm[ch], g)));
        const blended = overlay * (1 - strength) + colorNorm[ch] * strength;
        const baseNorm = base[p * 3 + ch] / 255;
        const v = baseNorm * (1 - a) + blended * a;
        out[p * 3 + ch] = Math.round(Math.min(1, Math.max(0, v)) * 255);
      }
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(path.join(dir, 'variants', `${colorId}.webp`));
    console.log(`${product.slug}/${colorId}.webp`);
  }
}

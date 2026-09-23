// Pre-renders every catalog color of every product for listing / SEO pages.
//
//   node scripts/render-variants.mjs
//
// Reads model-photo.png (untouched photo) + garment-layer.png (the cached segmentation mask,
// see scripts/make-garment-layer.mjs) and writes public/products/<slug>/variants/<colorId>.webp.
//
// Recolor method: convert each garment pixel to CIE Lab and replace a*/b* (color) with the
// target color's. L* (lightness) is re-centered on the target color's own L — keeping the
// source pixel's *shading relative to the garment's average* (so folds, shadows and fabric
// texture still come straight from the photo) while shifting the overall brightness so a
// black target actually renders black and a white target actually renders white, instead of
// staying pinned to the original photo's own brightness (e.g. a white shirt recolored "black"
// would otherwise still read as light grey). The mask's alpha is already feathered (blurred)
// at generation time, so compositing by alpha here blends the recolored garment into the
// untouched photo without a cutout look.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { rgbToLab, labToRgb, hexToLab } from './lab-color.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/data/products.json'), 'utf8'));
const colorHex = Object.fromEntries(catalog.colors.map((c) => [c.id, c.hex]));

for (const product of catalog.products) {
  const dir = path.join(root, 'public/products', product.slug);
  const { data: base, info } = await sharp(path.join(dir, 'model-photo.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  // Only the mask's alpha channel is used — the garment's own color per pixel is read straight
  // from the untouched base photo, not from the layer's stored grayscale.
  const { data: garment } = await sharp(path.join(dir, 'garment-layer.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // The garment's own average lightness, so per-pixel L can be re-centered on the target
  // color's L while keeping each pixel's shading relative to that average (see comment above).
  let sourceLSum = 0, sourceLCount = 0;
  for (let p = 0; p < n; p++) {
    if (garment[p * 4 + 3] / 255 > 0.5) {
      sourceLSum += rgbToLab(base[p * 3], base[p * 3 + 1], base[p * 3 + 2])[0];
      sourceLCount++;
    }
  }
  const sourceAvgL = sourceLCount > 0 ? sourceLSum / sourceLCount : 50;

  await fs.mkdir(path.join(dir, 'variants'), { recursive: true });
  for (const colorId of product.colors) {
    if (colorId === product.originalColor) continue;
    const [targetL, targetA, targetB] = hexToLab(colorHex[colorId]);
    const out = Buffer.alloc(n * 3);
    for (let p = 0; p < n; p++) {
      const a = garment[p * 4 + 3] / 255;
      const r0 = base[p * 3], g0 = base[p * 3 + 1], b0 = base[p * 3 + 2];
      if (a <= 0.03) {
        out[p * 3] = r0;
        out[p * 3 + 1] = g0;
        out[p * 3 + 2] = b0;
        continue;
      }
      const [L] = rgbToLab(r0, g0, b0);
      const newL = Math.min(100, Math.max(0, targetL + (L - sourceAvgL)));
      const [rr, rg, rb] = labToRgb(newL, targetA, targetB);
      out[p * 3] = Math.round(r0 * (1 - a) + rr * a);
      out[p * 3 + 1] = Math.round(g0 * (1 - a) + rg * a);
      out[p * 3 + 2] = Math.round(b0 * (1 - a) + rb * a);
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(path.join(dir, 'variants', `${colorId}.webp`));
    console.log(`${product.slug}/${colorId}.webp`);
  }
}

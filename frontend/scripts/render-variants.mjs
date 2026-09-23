// Pre-renders every catalog color of every product for listing / SEO pages.
//
//   node scripts/render-variants.mjs
//
// Reads model-photo.png (untouched photo) + garment-layer.png (the cached segmentation mask,
// see scripts/make-garment-layer.mjs) and writes public/products/<slug>/variants/<colorId>.webp.
//
// Recolor method: convert each garment pixel to CIE Lab, replace only a*/b* (color) with the
// target color's a*/b*, and leave L* (that pixel's own lightness) untouched. This is the same
// trick as Photoshop's "Color" blend mode — folds, shadows and fabric texture come straight
// from the source photo's own brightness, only the hue/saturation changes. The mask's alpha is
// already feathered (blurred) at generation time, so compositing by alpha here blends the
// recolored garment into the untouched photo without a cutout look.

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

  await fs.mkdir(path.join(dir, 'variants'), { recursive: true });
  for (const colorId of product.colors) {
    if (colorId === product.originalColor) continue;
    const [, targetA, targetB] = hexToLab(colorHex[colorId]);
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
      const [rr, rg, rb] = labToRgb(L, targetA, targetB);
      out[p * 3] = Math.round(r0 * (1 - a) + rr * a);
      out[p * 3 + 1] = Math.round(g0 * (1 - a) + rg * a);
      out[p * 3 + 2] = Math.round(b0 * (1 - a) + rb * a);
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(path.join(dir, 'variants', `${colorId}.webp`));
    console.log(`${product.slug}/${colorId}.webp`);
  }
}

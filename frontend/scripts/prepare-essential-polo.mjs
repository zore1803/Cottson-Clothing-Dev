// One-off conversion of the mockup collar-trim photos (public/mockup/polo-*.png) into
// the catalog's standard product image layout, so the Essential Polo works with the
// existing ProductCard / variantUrl() pipeline like every other product.
//
//   node scripts/prepare-essential-polo.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mockupDir = path.join(root, 'public/mockup');
const outDir = path.join(root, 'public/products/essential-polo');

await fs.mkdir(path.join(outDir, 'variants'), { recursive: true });

// green is the original color -> photo.jpg
await sharp(path.join(mockupDir, 'polo-green.png')).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toFile(path.join(outDir, 'photo.jpg'));
console.log('wrote photo.jpg (green)');

for (const id of ['black', 'navy', 'red', 'white']) {
  await sharp(path.join(mockupDir, `polo-${id}.png`)).webp({ quality: 90 }).toFile(path.join(outDir, 'variants', `${id}.webp`));
  console.log(`wrote variants/${id}.webp`);
}

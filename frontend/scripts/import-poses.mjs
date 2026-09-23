// Bulk-imports a batch of new product photography (see scripts/import-manifest.json) into the
// site's pose-gallery layout, and registers the products in src/data/products.json.
//
//   node scripts/import-poses.mjs [--only slug1,slug2]
//
// For each product, every source pose photo gets the same treatment as
// make-product-from-photo.mjs (person segmented onto a flat studio backdrop, garment
// segmented into a feathered-alpha mask) — but the segmentation pipeline is loaded once and
// reused across every photo instead of once per process, since this runs over ~100+ images.
//
// Output layout per product:
//   public/products/<slug>/photos/<i>/model-photo.png   (i = 0..poses-1)
//   public/products/<slug>/photos/<i>/garment-layer.png
//   public/products/<slug>/model-photo.png               (= photos/0, duplicated at the
//   public/products/<slug>/garment-layer.png                product root so the existing
//   public/products/<slug>/photo.jpg                        single-pose code paths — listing
//                                                            cards, render-variants.mjs, the
//                                                            live shader with no pose given —
//                                                            keep working unchanged)

import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { pipeline, RawImage } from '@huggingface/transformers';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, '.import-src');
const backdrop = [0xba, 0xc1, 0xc5]; // matches make-product-from-photo.mjs's default

const onlyArg = process.argv.find((a) => a.startsWith('--only'));
const only = onlyArg ? new Set(onlyArg.split('=')[1].split(',')) : null;

const manifest = JSON.parse(await fs.readFile(path.join(root, 'scripts/import-manifest.json'), 'utf8'));

function naturalFiles(dir, prefix) {
  return fs.readdir(dir).then((names) =>
    names
      .filter((n) => n.startsWith(prefix))
      .sort((a, b) => {
        const na = parseInt(a.slice(prefix.length), 10);
        const nb = parseInt(b.slice(prefix.length), 10);
        return na - nb;
      })
  );
}

console.log('Loading segmentation model (first run downloads it)…');
const segment = await pipeline('image-segmentation', 'Xenova/segformer_b2_clothes');

function dilate(m, W, H, r) {
  const n = W * H;
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
function erode(m, W, H, r) {
  const n = W * H;
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
const closeGaps = (m, W, H, r) => erode(dilate(m, W, H, r), W, H, r);

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

function maskOf(results, labels, W, H) {
  const n = W * H;
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
function personMaskOf(results, W, H) {
  const n = W * H;
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
function fabricLab(rgb, m, n) {
  const L = [], A = [], B = [];
  for (let p = 0; p < n; p += 7) if (m[p]) { const lab = toLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]); L.push(lab[0]); A.push(lab[1]); B.push(lab[2]); }
  return L.length ? [median(L), median(A), median(B)] : null;
}
function growByColor(rgb, m, W, H, radius, threshold) {
  const n = W * H;
  const zone = dilate(m, W, H, radius);
  const lab = fabricLab(rgb, m, n);
  if (!lab) return m;
  const out = new Uint8Array(m);
  for (let p = 0; p < n; p++) {
    if (zone[p] && !out[p] && labDist(toLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]), lab) < threshold) out[p] = 1;
  }
  return out;
}

async function processPhoto(photoPath, outDir) {
  const { data: rgb, info } = await sharp(photoPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;

  const image = new RawImage(new Uint8ClampedArray(rgb), W, H, 3);
  const results = await segment(image);

  const person = closeGaps(personMaskOf(results, W, H), W, H, 6);
  let personCov = 0;
  for (let p = 0; p < n; p++) personCov += person[p];
  if (personCov < n * 0.1) throw new Error(`${photoPath}: segmentation found almost no person`);

  const top = closeGaps(growByColor(rgb, maskOf(results, ['Upper-clothes', 'Dress'], W, H), W, H, 15, 18), W, H, 5);
  let topCov = 0;
  for (let p = 0; p < n; p++) topCov += top[p];
  if (topCov < n * 0.02) throw new Error(`${photoPath}: segmentation found almost no garment`);

  const personAlphaRaw = Buffer.alloc(n);
  for (let p = 0; p < n; p++) personAlphaRaw[p] = person[p] ? 255 : 0;
  const personAlpha = await sharp(personAlphaRaw, { raw: { width: W, height: H, channels: 1 } })
    .blur(1.5).extractChannel(0).raw().toBuffer();

  const composed = Buffer.alloc(n * 3);
  for (let p = 0; p < n; p++) {
    const a = personAlpha[p] / 255;
    for (let ch = 0; ch < 3; ch++) composed[p * 3 + ch] = Math.round(rgb[p * 3 + ch] * a + backdrop[ch] * (1 - a));
  }

  await fs.mkdir(outDir, { recursive: true });
  await sharp(composed, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(outDir, 'model-photo.png'));

  const topAlphaRaw = Buffer.alloc(n);
  for (let p = 0; p < n; p++) topAlphaRaw[p] = top[p] ? 255 : 0;
  const topAlpha = await sharp(topAlphaRaw, { raw: { width: W, height: H, channels: 1 } })
    .blur(1.2).extractChannel(0).raw().toBuffer();

  const garmentOut = Buffer.alloc(n * 4);
  for (let p = 0; p < n; p++) {
    const g = Math.round(0.2126 * rgb[p * 3] + 0.7152 * rgb[p * 3 + 1] + 0.0722 * rgb[p * 3 + 2]);
    garmentOut[p * 4] = g;
    garmentOut[p * 4 + 1] = g;
    garmentOut[p * 4 + 2] = g;
    garmentOut[p * 4 + 3] = topAlpha[p];
  }
  await sharp(garmentOut, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(outDir, 'garment-layer.png'));

  return { W, H };
}

const results = [];
for (const product of manifest.products) {
  if (only && !only.has(product.slug)) continue;
  const { dir, prefix } = product.source;
  const srcDir = path.join(srcRoot, dir);
  const files = await naturalFiles(srcDir, prefix);
  if (files.length === 0) throw new Error(`No source photos found for ${product.slug} in ${srcDir}`);
  console.log(`\n=== ${product.slug} (${files.length} poses) ===`);

  const outRoot = path.join(root, 'public/products', product.slug);
  for (let i = 0; i < files.length; i++) {
    const photoPath = path.join(srcDir, files[i]);
    const poseDir = path.join(outRoot, 'photos', String(i));
    console.log(`  pose ${i}: ${files[i]}`);
    await processPhoto(photoPath, poseDir);
    if (i === 0) {
      await fs.copyFile(path.join(poseDir, 'model-photo.png'), path.join(outRoot, 'model-photo.png'));
      await fs.copyFile(path.join(poseDir, 'garment-layer.png'), path.join(outRoot, 'garment-layer.png'));
      await sharp(path.join(poseDir, 'model-photo.png')).jpeg({ quality: 90 }).toFile(path.join(outRoot, 'photo.jpg'));
    }
  }
  results.push({ slug: product.slug, poses: files.length });
}

// ---- register in products.json ----
const catalogPath = path.join(root, 'src/data/products.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));

for (const c of manifest.newColors) {
  if (!catalog.colors.some((x) => x.id === c.id)) catalog.colors.push(c);
}
for (const product of manifest.products) {
  if (only && !only.has(product.slug)) continue;
  const poseCount = results.find((r) => r.slug === product.slug)?.poses;
  const { source: _source, ...entry } = product;
  if (poseCount && poseCount > 1) entry.poses = poseCount;
  const idx = catalog.products.findIndex((p) => p.slug === product.slug);
  if (idx >= 0) catalog.products[idx] = entry;
  else catalog.products.push(entry);
}
await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`\nWrote ${results.length} product(s) into src/data/products.json`);

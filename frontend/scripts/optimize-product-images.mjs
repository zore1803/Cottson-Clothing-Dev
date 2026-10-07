// Converts the product pose images to WebP so the browser downloads kilobytes, not megabytes.
//
//   node scripts/optimize-product-images.mjs --dry-run   # report what would change
//   node scripts/optimize-product-images.mjs             # convert, then delete each PNG once its WebP is verified
//
// For every public/products/**/model-photo.png and garment-layer.png this writes the same name
// with a .webp extension, scaled down to at most MAX_WIDTH pixels wide (never upscaled; the
// aspect ratio is kept, and every size the site uses is a fraction of the frame, so nothing
// shifts). The garment layer keeps its transparency at full alpha quality because it drives the
// live recolor. Safe to re-run: files with no PNG left are skipped.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../public/products");
const MAX_WIDTH = 1600;
const TARGETS = new Set(["model-photo.png", "garment-layer.png"]);
const dry = process.argv.includes("--dry-run");

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (TARGETS.has(e.name)) yield p;
  }
}

const mb = (n) => (n / 1048576).toFixed(2);
let before = 0;
let after = 0;
let converted = 0;
const failures = [];
const perProduct = new Map();

for await (const png of walk(ROOT)) {
  const out = png.replace(/\.png$/, ".webp");
  const size = (await fs.stat(png)).size;
  const slug = path.relative(ROOT, png).split(path.sep)[0];
  try {
    const meta = await sharp(png).metadata();
    const width = Math.min(meta.width, MAX_WIDTH);
    const isLayer = path.basename(png) === "garment-layer.png";
    const pipeline = sharp(png).resize({ width, withoutEnlargement: true });
    const buf = await pipeline
      .webp(isLayer ? { quality: 92, alphaQuality: 100, effort: 5 } : { quality: 90, effort: 5, smartSubsample: true })
      .toBuffer();

    // Verify before touching the original: same aspect ratio, and the layer still has transparency
    const check = await sharp(buf).metadata();
    const ratioIn = meta.width / meta.height;
    const ratioOut = check.width / check.height;
    if (Math.abs(ratioIn - ratioOut) > 0.002) throw new Error(`aspect ratio changed (${ratioIn.toFixed(4)} -> ${ratioOut.toFixed(4)})`);
    if (isLayer && meta.hasAlpha && !check.hasAlpha) throw new Error("transparency was lost");

    before += size;
    after += buf.length;
    converted++;
    const p = perProduct.get(slug) ?? { before: 0, after: 0 };
    p.before += size;
    p.after += buf.length;
    perProduct.set(slug, p);

    if (!dry) {
      await fs.writeFile(out, buf);
      await fs.unlink(png);
    }
  } catch (e) {
    failures.push(`${path.relative(ROOT, png)}: ${e.message}`);
  }
}

console.log(`${dry ? "[dry run] " : ""}${converted} images ${dry ? "would be " : ""}converted`);
console.log(`before ${mb(before)} MB, after ${mb(after)} MB (${before ? Math.round((1 - after / before) * 100) : 0}% smaller)\n`);
console.log("largest savings by product:");
[...perProduct.entries()]
  .sort((a, b) => b[1].before - b[1].after - (a[1].before - a[1].after))
  .slice(0, 8)
  .forEach(([slug, p]) => console.log(`  ${slug.padEnd(24)} ${mb(p.before).padStart(7)} MB -> ${mb(p.after).padStart(6)} MB`));
if (failures.length) {
  console.error(`\n${failures.length} file(s) left untouched:`);
  failures.forEach((f) => console.error("  " + f));
  process.exitCode = 1;
}

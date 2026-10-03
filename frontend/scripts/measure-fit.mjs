// Measures where the garment sits in each product photo, so logos can be placed and sized in
// real centimetres (see src/components/design-studio/placement.ts).
//
//   node scripts/measure-fit.mjs            -> writes `fit` into src/data/products.json
//
// Reads public/products/<slug>/garment-layer.png (the garment cut out of the photo) and records,
// as fractions of the 2:3 photo frame the product page shows (object-cover, so wider photos lose
// their sides):
//   chest - torso width, taken below the sleeves (median over the middle-lower torso)
//   top   - top of the garment (collar / shoulders)
//   cx    - horizontal centre of the torso
// Arms folded across a long-sleeve shirt merge into the torso outline and can't be separated
// here; those photos fall back to the catalog's typical torso width. Edit the JSON by hand if a
// photo still looks off.
import fs from "node:fs";
import sharp from "sharp";

const FRAME_ASPECT = 682 / 1024; // IMAGE_ASPECT in placement.ts
const catalogPath = "src/data/products.json";
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

async function measure(slug) {
  const file = `public/products/${slug}/garment-layer.png`;
  if (!fs.existsSync(file)) return null;
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const on = (x, y) => data[(y * W + x) * 4 + 3] > 128;

  let top = -1, bottom = -1;
  for (let y = 0; y < H; y++) {
    let any = false;
    for (let x = 0; x < W; x += 2) if (on(x, y)) { any = true; break; }
    if (any) { if (top < 0) top = y; bottom = y; }
  }
  if (top < 0) return null;

  // Contiguous garment run through the row's centre of mass: the torso, without arms beside it
  const torsoRow = (y) => {
    let sx = 0, n = 0;
    for (let x = 0; x < W; x++) if (on(x, y)) { sx += x; n++; }
    if (!n) return null;
    const c = Math.round(sx / n);
    if (!on(c, y)) return null;
    let l = c, r = c;
    while (l > 0 && on(l - 1, y)) l--;
    while (r < W - 1 && on(r + 1, y)) r++;
    return { l, r };
  };
  const runs = [];
  for (let f = 0.5; f <= 0.8 + 1e-9; f += 0.05) {
    const run = torsoRow(Math.round(top + f * (bottom - top)));
    // A hand in front of the torso splits it into slivers; ignore those rows
    if (run && run.r - run.l + 1 >= 0.2 * W) runs.push(run);
  }
  if (!runs.length) return null;
  runs.sort((a, b) => a.r - a.l - (b.r - b.l));
  const mid = runs[Math.floor(runs.length / 2)];

  // Frame = the centred H·aspect wide slice of the photo (or the full width if the photo is narrower)
  const frameW = Math.min(W, H * FRAME_ASPECT);
  const cropLeft = (W - frameW) / 2;
  return {
    chest: (mid.r - mid.l + 1) / frameW,
    top: top / H,
    cx: ((mid.l + mid.r) / 2 - cropLeft) / frameW,
  };
}

const measured = new Map();
for (const p of catalog.products) {
  const m = await measure(p.slug);
  if (m) measured.set(p.slug, m);
}

// Full-length model shots (garment starting in the top third) should have a torso of roughly
// 35-52% of the frame; outside that the measurement caught arms, so use the typical value
const fullShot = (m) => m.top < 0.33;
const plausible = (m) => !fullShot(m) || (m.chest >= 0.35 && m.chest <= 0.52);
const typical = [...measured.values()].filter((m) => fullShot(m) && plausible(m)).map((m) => m.chest).sort((a, b) => a - b);
const typicalChest = typical[Math.floor(typical.length / 2)];

const r3 = (n) => Math.round(n * 1000) / 1000;
for (const p of catalog.products) {
  const m = measured.get(p.slug);
  if (!m) continue;
  const ok = plausible(m);
  p.fit = { chest: r3(ok ? m.chest : typicalChest), top: r3(m.top), cx: r3(ok ? m.cx : 0.5) };
  console.log(`${p.slug.padEnd(24)} chest ${p.fit.chest}${ok ? "" : ` (measured ${r3(m.chest)}, using typical)`}  top ${p.fit.top}  cx ${p.fit.cx}`);
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");

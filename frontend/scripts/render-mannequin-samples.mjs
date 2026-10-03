// Phase B sample renders, made with the SHARED core (Node): tmp/phase-b/*.png (1200 × 1600)
//   node scripts/render-mannequin-samples.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { renderDesign, savePng } from "./lib/mannequin-node.mjs";

const OUT = path.resolve(import.meta.dirname, "..", "..", "tmp", "phase-b");
fs.mkdirSync(OUT, { recursive: true });

// Stock colours (src/data/colors.json)
const C = { navy: "#1f2a44", white: "#f5f5f2", red: "#c8102e", yellow: "#f2e08a", sky: "#8fc7ec", green: "#7ac142" };

// A small wordmark with an asymmetric mark, so a mirrored (reversed) logo is obvious
const logoPng = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><path d="M40 60h220v80H130v220H40z" fill="#c8102e"/><text x="290" y="260" font-family="Arial" font-weight="700" font-size="170" fill="#ffffff" stroke="#111" stroke-width="6">CTN</text></svg>`
  )
)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const LOGO = { rgba: new Uint8ClampedArray(logoPng.data), w: logoPng.info.width, h: logoPng.info.height };

const renders = [
  ["01-front-buttons-navy-single-white", { view: "front", closure: "buttons", trimStyle: "single", colours: { body: C.navy }, trim1: C.white, logo: { ...LOGO, zoneId: "left-chest", scale: 1 } }],
  ["02-front-zip-navy-double-red-white", { view: "front", closure: "zip", trimStyle: "double", colours: { body: C.navy }, trim1: C.red, trim2: C.white }],
  ["03-front-zip-yellow-pocket-single-green", { view: "front", closure: "zip", pocket: true, trimStyle: "single", colours: { body: C.yellow }, trim1: C.green }],
  ["04-back-navy-double-red-white", { view: "back", trimStyle: "double", colours: { body: C.navy }, trim1: C.red, trim2: C.white }],
  ["05-side-left-noarm-navy-double-red-white", { view: "side-left", trimStyle: "double", colours: { body: C.navy }, trim1: C.red, trim2: C.white }],
  ["06-side-right-mirrored-yellow-single-green", { view: "side-right", trimStyle: "single", colours: { body: C.yellow }, trim1: C.green, logo: { ...LOGO, zoneId: "right-sleeve", scale: 1 } }],
  ["08-contrast-body-yellow-sleeves-red-collar-sky-front", { view: "front", closure: "buttons", colours: { body: C.yellow, sleeve: C.red, collar: C.sky } }],
  ["09-contrast-body-yellow-sleeves-red-collar-sky-side-left", { view: "side-left", colours: { body: C.yellow, sleeve: C.red, collar: C.sky } }],
];

// --no-dilate: turn the 1 px part-mask fix off (to see the body-colour rim it removes)
const dilate = process.argv.includes("--no-dilate") ? false : undefined;
const times = [];
for (const [name, d] of renders) {
  const r = await renderDesign({ ...d, dilateParts: dilate });
  times.push(r.ms);
  await savePng(r.rgba, r.width, r.height, path.join(OUT, `${name}.png`));
  console.log(`${name}.png  (${r.folder}${r.mirrored ? ", mirrored" : ""}) ${r.ms.toFixed(0)} ms`);

  // 4× zoom crops of the contrast renders, at points found from the masks
  if (name.startsWith("08") || name.startsWith("09")) {
    const tag = name.startsWith("08") ? "front" : "side-left";
    const { masks } = r.layers, t = r.config, W = t.width, H = t.height;
    const m = (id) => masks[t.regions.find((q) => q.id === id).mask];
    const on = (a, x, y) => a[y * W + x] > 127;
    // Sleeve outer edge: the sleeve pixel furthest from the garment's centre, at the sleeve's middle row
    const sleeve = m("sleeve");
    let sy0 = H, sy1 = 0;
    for (let i = 0; i < sleeve.length; i++) if (sleeve[i] > 127) { const y = (i / W) | 0; sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y); }
    const sy = Math.round((sy0 + sy1) / 2);
    let sx = -1;
    for (let x = 0; x < W && sx < 0; x++) if (on(sleeve, x, sy)) sx = x; // leftmost sleeve pixel on that row
    // Collar top rim: topmost collar pixel
    const collar = m("collar");
    let cx = 0, cy = -1;
    for (let i = 0; i < collar.length && cy < 0; i++) if (collar[i] > 127) { cy = (i / W) | 0; cx = i % W; }
    // Cuff hem: lowest cuff pixel
    const cuff = m("cuff");
    let hx = 0, hy = -1;
    for (let i = cuff.length - 1; i >= 0 && hy < 0; i--) if (cuff[i] > 127) { hy = (i / W) | 0; hx = i % W; }
    for (const [label, x, y] of [["sleeve-outer-edge", sx, sy], ["collar-top-rim", cx, cy], ["cuff-hem", hx, hy]]) {
      const S = 60, left = Math.max(0, Math.min(W - S, x - S / 2)), top = Math.max(0, Math.min(H - S, y - S / 2));
      await sharp(Buffer.from(r.rgba.buffer, r.rgba.byteOffset, r.rgba.length), { raw: { width: W, height: H, channels: 4 } })
        .extract({ left, top, width: S, height: S })
        .resize(S * 4, S * 4, { kernel: "nearest" })
        .png()
        .toFile(path.join(OUT, `10-zoom-${tag}-${label}.png`));
      console.log(`  10-zoom-${tag}-${label}.png at (${x}, ${y})`);
    }
  }
}
console.log(`core render time per view (full 1200×1600): median ${times.sort((a, b) => a - b)[times.length >> 1].toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`);

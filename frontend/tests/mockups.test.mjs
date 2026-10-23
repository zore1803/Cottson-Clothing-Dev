// Mannequin mockup tests (node:test), run with: npm run test:mockups
// T1–T6 render the real assets with the SHARED core (src/lib/mockup/core). T7 re-renders the ghost
// templates in the browser and diffs them against tmp/mockup-baseline (needs `npm run dev`).
import { existsSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { loadFamily, loadLayers, renderDesign } from "../scripts/lib/mannequin-node.mjs";
import { flattenOnto, flipHorizontal, grainAmpFor, grainField, hashRgba, shadeColour, shadeColourContrast } from "../src/lib/mockup/core/composite.ts";
import { assembleComposite, zoneDisabled } from "../src/lib/mockup/core/assemble.ts";
import { resolveView, zonesFor } from "../src/lib/mockup/mannequin.ts";

const NAVY_TEST = "#1b2a56"; // (27, 42, 86), the brief's T1 navy
const VIEWS = [
  // [label, design], one per template folder and shading variant
  ["polo-front", { view: "front", closure: "buttons", pocket: false }],
  ["polo-front + pocket", { view: "front", closure: "buttons", pocket: true }],
  ["polo-front-zip", { view: "front", closure: "zip", pocket: false }],
  ["polo-front-zip + pocket", { view: "front", closure: "zip", pocket: true }],
  ["polo-back", { view: "back" }],
  ["polo-side-noarm", { view: "side-left" }],
  ["polo-side (arm)", { view: "side-left", arm: true }],
];
const lum = (px, i) => 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];

/** Render one of VIEWS; `arm` switches the family to the arm side view */
async function render(d, extra = {}) {
  if (d.arm) {
    const layers = await loadLayers("polo-side", false);
    return renderWith(layers, { ...d, ...extra });
  }
  return renderDesign({ ...d, ...extra });
}
// Same as renderDesign, for a folder the family wouldn't pick by default
async function renderWith(layers, d) {
  const { composite } = await import("../src/lib/mockup/core/composite.ts");
  const input = assembleComposite(layers.config, layers, {
    options: { view: "side-left", closure: "buttons", pocket: false, trimStyle: d.trimStyle ?? "none" },
    colours: d.colours ?? {},
    trim1: d.trim1 ?? "#f5f5f2",
    trim2: d.trim2 ?? "#f5f5f2",
  });
  return { rgba: composite(input), width: layers.config.width, height: layers.config.height, config: layers.config, layers };
}
const allNavy = (t) => Object.fromEntries(t.regions.map((r) => [r.id, NAVY_TEST]));
const maskOf = (r, id) => r.layers.masks[r.config.regions.find((q) => q.id === id).mask];

/** Pixels within `radius` px (disk) of any set pixel */
function dilate(set, W, H, radius) {
  const out = new Uint8Array(set.length);
  const offs = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) if (dx * dx + dy * dy <= radius * radius) offs.push([dx, dy]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!set[y * W + x]) continue;
      for (const [dx, dy] of offs) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1;
      }
    }
  return out;
}

for (const [label, d] of VIEWS) {
  test(`T1 no unpainted pixels: ${label}`, async () => {
    const first = await render(d);
    const r = await render(d, { colours: allNavy(first.config), trimStyle: "none" });
    const W = r.width, H = r.height, body = maskOf(r, "body");
    // Exclude the zipper (never recoloured), dilated 5 px
    let skip = new Uint8Array(W * H);
    for (const det of r.layers.details) {
      const z = new Uint8Array(W * H);
      for (let i = 0; i < z.length; i++) if (det[i * 4 + 3] > 10) z[i] = 1;
      skip = dilate(z, W, H, 5);
    }
    // Renders are transparent now: measure what shows on a white page
    const onWhite = flattenOnto(r.rgba, [255, 255, 255]);
    let bad = 0;
    for (let i = 0; i < W * H; i++) if (body[i] > 0.9 * 255 && !skip[i] && lum(onWhite, i) >= 110) bad++;
    assert.equal(bad, 0, `${bad} light pixels inside the shirt`);
  });

  test(`T2 no background leak: ${label}`, async () => {
    const r = await render(d, { trimStyle: "double", trim1: "#c8102e", trim2: "#f5f5f2" });
    const W = r.width, H = r.height, body = maskOf(r, "body"), man = r.layers.mannequin;
    const set = new Uint8Array(W * H);
    for (let i = 0; i < set.length; i++) if (body[i] > 0.02 * 255 || man[i * 4 + 3] > 0.02 * 255) set[i] = 1;
    const near = dilate(set, W, H, 3);
    // Away from the shirt and mannequin the render must be fully transparent
    let bad = 0;
    for (let i = 0; i < W * H; i++) if (!near[i] && r.rgba[i * 4 + 3] !== 0) bad++;
    assert.equal(bad, 0, `${bad} non-transparent pixels away from the shirt and mannequin`);
  });

  test(`T3 trims inside the shirt: ${label}`, async () => {
    const r = await render(d);
    const body = maskOf(r, "body");
    for (const f of [r.config.trims.single, r.config.trims.doubleA, r.config.trims.doubleB]) {
      const t = r.layers.masks[f];
      let out = 0;
      for (let i = 0; i < t.length; i++) if (t[i] > 0 && body[i] === 0) out++;
      assert.equal(out, 0, `${f}: ${out} trim pixels outside mask-body`);
    }
  });
}

for (const [label, d] of VIEWS)
  test(`T9 transparent background, no halo: ${label}`, async () => {
    const r = await render(d, { colours: { body: "#1f2a44" }, trimStyle: "double", trim1: "#c8102e", trim2: "#f5f5f2" });
    const W = r.width, H = r.height, body = maskOf(r, "body"), man = r.layers.mannequin;
    for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) assert.equal(r.rgba[(y * W + x) * 4 + 3], 0, `corner (${x}, ${y}) transparent`);
    const set = new Uint8Array(W * H);
    for (let i = 0; i < set.length; i++) if (body[i] > 0.02 * 255 || man[i * 4 + 3] > 0.02 * 255) set[i] = 1;
    const near = dilate(set, W, H, 3);
    // On white: nothing but white away from the coverage (no stray halo or fringe)
    const white = flattenOnto(r.rgba, [255, 255, 255]);
    let halo = 0;
    for (let i = 0; i < W * H; i++) if (!near[i] && (white[i * 4] !== 255 || white[i * 4 + 1] !== 255 || white[i * 4 + 2] !== 255)) halo++;
    assert.equal(halo, 0, `${halo} non-white pixels on white away from the coverage`);
    // On a dark page the same: only the page colour away from the coverage
    const dark = flattenOnto(r.rgba, [0x0b, 0x1b, 0x3a]);
    let darkHalo = 0;
    for (let i = 0; i < W * H; i++) if (!near[i] && (dark[i * 4] !== 0x0b || dark[i * 4 + 1] !== 0x1b || dark[i * 4 + 2] !== 0x3a)) darkHalo++;
    assert.equal(darkHalo, 0, `${darkHalo} stray pixels on #0b1b3a away from the coverage`);
  });

test("T4 colour formula (contrast shading, grain off)", () => {
  const p = { foldStrength: 0.55, gainBase: 1.2, gainDark: 1.4 };
  // Rounded and clamped, as the composite writes it (grain off = multiplier 1)
  const shade = (c, S) => shadeColourContrast(c, S, p).map((v) => Math.round(Math.min(255, Math.max(0, v))));
  assert.deepEqual(shade([27, 42, 86], 1), [27, 42, 86], "navy S = 1.0 exactly");
  const cases = [
    [[27, 42, 86], 0.9, [8, 19, 53], "navy S = 0.9"],
    [[27, 42, 86], 1.1, [46, 65, 119], "navy S = 1.1"],
    [[30, 30, 30], 0.9, [8, 8, 8], "black S = 0.9"],
    [[30, 30, 30], 1.1, [52, 52, 52], "black S = 1.1"],
    [[245, 214, 90], 0.9, [203, 177, 72], "yellow S = 0.9"],
  ];
  for (const [c, S, want, label] of cases) {
    const got = shade(c, S);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(got[k] - want[k]) <= 1, `${label}: got (${got}), want (${want}) ±1`);
  }
  assert.deepEqual(shade([245, 245, 245], 1.1), [255, 255, 255], "white S = 1.1 clamps to 255");
  // Templates without gainBase keep the previous formula
  assert.deepEqual(shadeColour([27, 42, 86], 1, 0.35), [27, 42, 86]);
  assert.deepEqual(shadeColour([27, 42, 86], 0.7, 0.35), [8, 19, 50]);
});

test("Grain: deterministic, unit variance, mean-neutral", async () => {
  const d = { view: "front", closure: "buttons", colours: { body: "#1f2a44" }, trimStyle: "double", trim1: "#c8102e", trim2: "#f5f5f2" };
  const a = await renderDesign(d), b = await renderDesign(d);
  assert.equal(hashRgba(a.rgba), hashRgba(b.rgba), "two renders in one process are byte-identical");
  const t = a.config.shading.grain;
  // Fresh field (cache bypassed by a different seed then the real one again) matches the cached one
  const g1 = grainField(a.width, a.height, t.seed, t.sigma);
  let mean = 0, sq = 0;
  for (const v of g1) mean += v;
  mean /= g1.length;
  for (const v of g1) sq += (v - mean) ** 2;
  assert.ok(Math.abs(mean) < 1e-3 && Math.abs(Math.sqrt(sq / g1.length) - 1) < 1e-3, "grain has mean 0, std 1");
  // Over a flat region (S = 1) the grained colour averages to the ungrained one within 0.5%
  const c = [31, 42, 68], amp = grainAmpFor(c, t);
  const flat = shadeColourContrast(c, 1, { ...a.config.shading });
  for (let k = 0; k < 3; k++) {
    let sum = 0;
    for (let i = 0; i < 200000; i++) sum += Math.min(255, Math.max(0, flat[k] * (1 + amp * g1[i])));
    const avg = sum / 200000;
    assert.ok(Math.abs(avg - flat[k]) / flat[k] < 0.005, `channel ${k}: grained mean ${avg.toFixed(2)} vs ${flat[k].toFixed(2)}`);
  }
});

test("T5 mirrored side-right view", async () => {
  const family = loadFamily();
  const view = resolveView(family, { view: "side-right", closure: "buttons" });
  assert.equal(view.mirrored, true);
  const plain = await loadLayers(view.folder, false), flipped = await loadLayers(view.folder, true);
  const W = plain.config.width, H = plain.config.height;
  // Every layer is the horizontal flip of the side-left one
  for (const f of Object.keys(plain.masks)) assert.deepEqual(flipped.masks[f], flipHorizontal(plain.masks[f], W, H, 1), `${f} flipped`);
  assert.deepEqual(flipped.mannequin, flipHorizontal(plain.mannequin, W, H, 4), "mannequin flipped");
  // Zone x mirrored: centre x' = width − centre x
  const left = plain.config.zones.find((z) => z.id === "left-sleeve");
  const right = zonesFor(family, flipped.config, true).find((z) => z.id === "right-sleeve");
  assert.equal(right.x + right.w / 2, W - (left.x + left.w / 2));
  assert.equal(right.rotation, -left.rotation);
  // Logo drawn un-mirrored: left half red, right half blue → red must stay on the left
  const lw = 200, lh = 100, logo = new Uint8ClampedArray(lw * lh * 4);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) logo.set(x < lw / 2 ? [220, 0, 0, 255] : [0, 0, 220, 255], (y * lw + x) * 4);
  const r = await renderDesign({ view: "side-right", colours: { body: "#f5f5f2" }, logo: { rgba: logo, w: lw, h: lh, zoneId: "right-sleeve", scale: 1 } });
  let rx = 0, rn = 0, bx = 0, bn = 0;
  for (let i = 0; i < r.width * r.height; i++) {
    const R = r.rgba[i * 4], B = r.rgba[i * 4 + 2], x = i % r.width;
    if (R > 150 && B < 90) {
      rx += x;
      rn++;
    } else if (B > 150 && R < 90) {
      bx += x;
      bn++;
    }
  }
  assert.ok(rn > 100 && bn > 100, "logo drawn");
  assert.ok(rx / rn < bx / bn, `logo reads left-to-right (red at x≈${(rx / rn).toFixed(0)}, blue at x≈${(bx / bn).toFixed(0)})`);
});

test("T6 pocket and zip", async () => {
  // Pocket on: base-pocket.png shading, pocket region drawn, left chest unavailable
  const layers = await loadLayers("polo-front", false);
  const withPocket = assembleComposite(layers.config, layers, { options: { view: "front", closure: "buttons", pocket: true, trimStyle: "none" }, colours: {}, trim1: "#fff", trim2: "#fff" });
  const without = assembleComposite(layers.config, layers, { options: { view: "front", closure: "buttons", pocket: false, trimStyle: "none" }, colours: {}, trim1: "#fff", trim2: "#fff" });
  assert.equal(withPocket.shading, layers.shading["base-pocket.png"]);
  assert.equal(without.shading, layers.shading["base.png"]);
  assert.equal(withPocket.layers.length, without.layers.length + 1, "pocket region added");
  assert.equal(zoneDisabled("left-chest", { pocket: true }), true);
  assert.equal(zoneDisabled("right-chest", { pocket: true }), false);
  assert.equal(zoneDisabled("left-chest", { pocket: false }), false);
  // Zip: the zipper is drawn last and never recoloured
  const a = await renderDesign({ view: "front", closure: "zip", colours: { body: "#1f2a44", placket: "#c8102e" }, trimStyle: "single", trim1: "#f5f5f2" });
  const b = await renderDesign({ view: "front", closure: "zip", colours: { body: "#f2e08a", placket: "#1f5a33" }, trimStyle: "double", trim1: "#c8102e", trim2: "#1d3fd6" });
  const zip = a.layers.details[0];
  assert.ok(zip, "zip view has details-zipper");
  let checked = 0;
  for (let i = 0; i < zip.length / 4; i++) {
    if (zip[i * 4 + 3] !== 255) continue;
    checked++;
    for (let k = 0; k < 3; k++) {
      assert.equal(a.rgba[i * 4 + k], zip[i * 4 + k], `zipper pixel ${i} unchanged (render A)`);
      assert.equal(b.rgba[i * 4 + k], zip[i * 4 + k], `zipper pixel ${i} unchanged (render B)`);
    }
  }
  assert.ok(checked > 1000, `${checked} opaque zipper pixels checked`);
});

test("PNG decoder (browser loader) matches sharp on every mannequin layer", async () => {
  const { decodePng } = await import("../src/lib/mockup/pngDecode.ts");
  const fs = await import("node:fs");
  const sharp = (await import("sharp")).default;
  const root = path.join(import.meta.dirname, "..", "public", "mockups", "mannequin");
  let files = 0;
  for (const folder of fs.readdirSync(root).filter((f) => fs.statSync(path.join(root, f)).isDirectory()))
    for (const f of fs.readdirSync(path.join(root, folder)).filter((n) => n.endsWith(".png"))) {
      const file = path.join(root, folder, f);
      const mine = await decodePng(fs.readFileSync(file).buffer.slice(0));
      const ref = await sharp(file).ensureAlpha().raw().toBuffer();
      assert.equal(mine.rgba.length, ref.length, `${folder}/${f} size`);
      let diff = 0;
      for (let i = 0; i < ref.length; i++) if (mine.rgba[i] !== ref[i]) diff++;
      assert.equal(diff, 0, `${folder}/${f}: ${diff} bytes differ from sharp`);
      files++;
    }
  assert.ok(files >= 54, `${files} layers checked`);
});

test("Grain: browser render is byte-identical to the Node render", async (t) => {
  const up = await fetch(process.env.APP_URL ?? "http://localhost:3000/mockup-lab").then((r) => r.ok).catch(() => false);
  if (!up) {
    t.skip("dev server not running on http://localhost:3000 (start `npm run dev`)");
    return;
  }
  const q = "view=front&closure=buttons&pocket=0&trim=double&trim1=c8102e&trim2=f5f5f2&body=1f2a44";
  const res = spawnSync(process.execPath, [path.join(import.meta.dirname, "..", "scripts", "browser-render-hash.mjs"), q], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  const browser = res.stdout.trim();
  const node = await renderDesign({ view: "front", closure: "buttons", pocket: false, trimStyle: "double", trim1: "#c8102e", trim2: "#f5f5f2", colours: { body: "#1f2a44" } });
  assert.equal(browser, hashRgba(node.rgba), "browser and Node core output hash");
});

test("T7 ghost templates render pixel-identical to the Step 0 baseline", async (t) => {
  // The baseline images are generated locally (`node scripts/ghost-regression.mjs capture`) and aren't committed
  if (!existsSync(path.join(import.meta.dirname, "..", "..", "tmp", "mockup-baseline"))) {
    t.skip("no baseline yet: run `node scripts/ghost-regression.mjs capture` once with the dev server up");
    return;
  }
  const up = await fetch(process.env.APP_URL ?? "http://localhost:3000/mockup-lab").then((r) => r.ok).catch(() => false);
  if (!up) {
    t.skip("dev server not running on http://localhost:3000 (start `npm run dev`)");
    return;
  }
  const res = spawnSync(process.execPath, [path.join(import.meta.dirname, "..", "scripts", "ghost-regression.mjs"), "compare"], { encoding: "utf8" });
  process.stdout.write(res.stdout);
  assert.equal(res.status, 0, `ghost regression failed:\n${res.stdout}${res.stderr}`);
});

// ---- Phase C1: customiser rules (pure functions) ------------------------------------------------
import { applyPlacementRules, choosePlacement, colourOf, defaultUiState, isMultiColour, sectionsFor, viewForPlacement } from "../src/lib/mockup/mannequinState.ts";
import { uiStateFromParams, uiStateToParams } from "../src/lib/mockup/mannequinUrl.ts";
import { activeRegions } from "../src/lib/mockup/mannequin.ts";

const base = defaultUiState({ bodyHex: "#1f2a44", tippingHex: "#c8102e", tipped: true });

test("C1 URL round trip (5 states)", () => {
  const states = [
    base,
    { ...base, view: "back", colours: { body: "#1f2a44", yoke: "#c8102e" }, zone: "back-full", scale: 0.85 },
    { ...base, closure: "zip", pocket: true, trimStyle: "double", trim1: "#c8102e", trim2: "#f5f5f2", zone: "right-chest", finish: "print", colours: { body: "#f2e08a", pocket: "#1f5a33", placket: "#1c1c1c" } },
    { ...base, style: "ghost", view: "side-right", trimStyle: "none", zone: "right-sleeve", scale: 0.7 },
    { ...base, view: "side-left", trimStyle: "single", trim1: "#7ac142", trim2: "#7ac142", colours: { body: "#f5f5f2", sleeve: "#c8102e", cuff: "#1f2a44", collar: "#8fc7ec", buttons: "#1c1c1c" }, zone: "left-sleeve", scale: 0.5 },
  ];
  for (const s of states) {
    const params = uiStateToParams(s);
    const back = uiStateFromParams(params, defaultUiState({}));
    assert.deepEqual(back, s, `round trip of ${JSON.stringify(params)}`);
  }
  // Garbage in the URL falls back to the defaults
  assert.deepEqual(uiStateFromParams({ view: "top", closure: "velcro", trim: "zigzag", zone: "hat", size: "400", body: "red" }, base), base);
});

test("C1 pocket rule", () => {
  const r = applyPlacementRules({ ...base, zone: "left-chest", pocket: true });
  assert.equal(r.state.zone, "right-chest");
  assert.equal(r.notice, true);
  assert.equal(applyPlacementRules({ ...base, zone: "center-chest", pocket: true }).notice, false);
  assert.equal(applyPlacementRules({ ...base, zone: "left-chest", pocket: false }).notice, false);
  // Choosing left chest while the pocket is on lands on right chest, with the notice
  const c = choosePlacement({ ...base, pocket: true }, "left-chest");
  assert.equal(c.state.zone, "right-chest");
  assert.equal(c.notice, true);
});

test("C1 viewForPlacement (all 7 placements)", () => {
  const want = {
    "left-chest": "front",
    "center-chest": "front",
    "right-chest": "front",
    "left-sleeve": "side-left",
    "right-sleeve": "side-right",
    "back-neck": "back",
    "back-full": "back",
  };
  for (const [id, view] of Object.entries(want)) assert.equal(viewForPlacement(id), view, id);
  // Choosing a placement also switches the view and resets the size (70% on sleeves)
  assert.deepEqual([choosePlacement(base, "left-sleeve").state.view, choosePlacement(base, "left-sleeve").state.scale], ["side-left", 0.7]);
  assert.deepEqual([choosePlacement(base, "back-full").state.view, choosePlacement(base, "back-full").state.scale], ["back", 1]);
});

test("C1 multi-colour caption", () => {
  assert.equal(isMultiColour({ trimStyle: "double", trim1: "#c8102e", trim2: "#f5f5f2" }), true);
  assert.equal(isMultiColour({ trimStyle: "double", trim1: "#c8102e", trim2: "#C8102E" }), false);
  assert.equal(isMultiColour({ trimStyle: "single", trim1: "#c8102e", trim2: "#f5f5f2" }), false);
  assert.equal(isMultiColour({ trimStyle: "none", trim1: "#c8102e", trim2: "#f5f5f2" }), false);
});

test("C1 colours survive view changes", () => {
  let s = { ...base, view: "back", colours: { body: "#1f2a44", yoke: "#c8102e", sleeve: "#f2e08a" } };
  for (const view of ["front", "side-left", "side-right", "back"]) s = applyPlacementRules({ ...s, view }).state;
  assert.deepEqual(s.colours, { body: "#1f2a44", yoke: "#c8102e", sleeve: "#f2e08a" });
  assert.deepEqual(colourOf("yoke", s.colours, "#ffffff"), { hex: "#c8102e", auto: false });
  assert.deepEqual(colourOf("cuff", s.colours, "#ffffff"), { hex: "#f2e08a", auto: true }, "cuffs follow the sleeves");
  assert.deepEqual(colourOf("buttons", s.colours, "#ffffff"), { hex: "#f5f5f2", auto: false }, "buttons default white");
});

test("C1 colour sections match the templates", async () => {
  const family = loadFamily();
  for (const view of ["front", "back", "side-left", "side-right"])
    for (const closure of ["buttons", "zip"])
      for (const pocket of [false, true]) {
        const o = { view, closure, pocket, trimStyle: "double" };
        const { folder, mirrored } = resolveView(family, o);
        const t = (await loadLayers(folder, mirrored)).config;
        const fromTemplate = activeRegions(t, view === "front" ? o : { pocket: false }).map((r) => r.id).sort();
        const fromUi = sectionsFor(o).filter((s) => !s.trim).map((s) => s.key).sort();
        assert.deepEqual(fromUi, fromTemplate, `${view} ${closure} pocket=${pocket}`);
      }
  assert.deepEqual(sectionsFor({ view: "front", closure: "zip", pocket: false, trimStyle: "none" }).map((s) => s.label), ["Body", "Sleeves", "Sleeve cuffs", "Collar", "Zip tape"]);
  assert.deepEqual(sectionsFor({ view: "front", closure: "buttons", pocket: false, trimStyle: "double" }).filter((s) => s.trim).map((s) => s.label), ["Outer stripe", "Inner stripe"]);
});

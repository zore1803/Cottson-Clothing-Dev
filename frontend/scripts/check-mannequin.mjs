// Checks for mannequin templates (style: "mannequin"), used by check-template.mjs.
// Ghost templates keep their own checks in check-template.mjs, unchanged.
import sharp from "sharp";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ON = 127; // "alpha > 127" = inside a mask
const PARTS = ["sleeve", "cuff", "collar", "placket", "buttons", "yoke"]; // must not overlap each other
const OUTSIDE_BODY_MAX = 0.005; // share of a part / trim mask allowed outside mask-body
const MANNEQUIN_INSIDE_BODY_MAX = 6000; // opaque (>230) mannequin pixels allowed inside the shirt
const BASE_MEDIAN = [185, 215];
const ZONE_INSIDE_MIN = 0.99;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
async function raw(file) {
  const img = sharp(file).ensureAlpha();
  const { width, height } = await img.metadata();
  const data = await img.raw().toBuffer();
  return { width, height, data };
}
const alphaOf = (r) => {
  const a = new Uint8Array(r.width * r.height);
  for (let i = 0; i < a.length; i++) a[i] = r.data[i * 4 + 3];
  return a;
};

/** Validate one mannequin view folder. Returns { errors, warnings, oks }. */
export async function checkMannequinTemplate(dir, config) {
  const errors = [], warnings = [], oks = [];
  const W = config.width, H = config.height;
  if (!W || !H) errors.push("template.json needs width and height");
  if (config.version !== 2) errors.push(`template.json version is ${config.version}, expected 2`);

  // Every referenced layer: exists and is exactly width × height
  const cache = new Map();
  const layer = async (label, file) => {
    if (cache.has(file)) return cache.get(file);
    const p = path.join(dir, file);
    if (!(await exists(p))) {
      errors.push(`${label}: ${file} not found`);
      cache.set(file, null);
      return null;
    }
    const r = await raw(p);
    if (r.width !== W || r.height !== H) {
      errors.push(`${label}: ${file} is ${r.width}×${r.height}, expected ${W}×${H}`);
      cache.set(file, null);
      return null;
    }
    cache.set(file, r);
    return r;
  };

  const bodyRegion = config.regions.find((r) => r.id === "body");
  const bodyRaw = bodyRegion ? await layer("body", bodyRegion.mask) : null;
  const body = bodyRaw ? alphaOf(bodyRaw) : null;
  if (!bodyRegion) errors.push('no "body" region');

  // base.png (and base-pocket.png): greyscale, median ~200 inside the shirt
  const shadingFiles = [config.layers.base, ...(config.variants?.pocket ? [config.variants.pocket.base] : [])];
  for (const f of shadingFiles) {
    const r = await layer("shading", f);
    if (!r || !body) continue;
    let colour = 0;
    const hist = new Uint32Array(256);
    for (let i = 0; i < W * H; i++) {
      const R = r.data[i * 4], G = r.data[i * 4 + 1], B = r.data[i * 4 + 2];
      if (Math.max(R, G, B) - Math.min(R, G, B) > 1) colour++;
      if (body[i] > ON) hist[R]++;
    }
    let total = 0, median = 0;
    for (const n of hist) total += n;
    for (let v = 0, seen = 0; v < 256; v++) if ((seen += hist[v]) >= total / 2) {
      median = v;
      break;
    }
    if (colour) errors.push(`${f} is not greyscale (${colour.toLocaleString("en")} pixels with R≠G≠B)`);
    if (median < BASE_MEDIAN[0] || median > BASE_MEDIAN[1]) errors.push(`${f}: median inside mask-body is ${median}, expected ${BASE_MEDIAN[0]}–${BASE_MEDIAN[1]}`);
    if (!colour && median >= BASE_MEDIAN[0] && median <= BASE_MEDIAN[1]) oks.push(`${f} greyscale, median ${median} inside the shirt`);
  }

  // Region + trim masks inside the body; parts don't overlap each other
  const masks = {};
  const trimFiles = [["trim-single", config.trims.single], ["trim-double-a", config.trims.doubleA], ["trim-double-b", config.trims.doubleB]];
  for (const [label, f] of [...config.regions.filter((r) => r.id !== "body").map((r) => [r.id, r.mask]), ...trimFiles]) {
    const r = await layer(label, f);
    if (!r || !body) continue;
    const a = alphaOf(r);
    let n = 0, out = 0;
    for (let i = 0; i < a.length; i++) if (a[i] > ON) {
      n++;
      if (body[i] <= ON) out++;
    }
    masks[label] = a;
    if (!n) errors.push(`${label}: ${f} is empty`);
    else if (out / n > OUTSIDE_BODY_MAX) errors.push(`${label}: ${((out / n) * 100).toFixed(2)}% of ${f} is outside mask-body (max 0.5%)`);
    else oks.push(`${label.padEnd(13)} ${f} (${n.toLocaleString("en")} px, ${((out / n) * 100).toFixed(2)}% outside body)`);
  }
  const parts = PARTS.filter((id) => masks[id]);
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      const a = masks[parts[i]], b = masks[parts[j]];
      let both = 0;
      for (let k = 0; k < a.length; k++) if (a[k] > ON && b[k] > ON) both++;
      if (both) errors.push(`${parts[i]} and ${parts[j]} overlap by ${both.toLocaleString("en")} px`);
    }
  if (masks.pocket)
    for (const id of parts) {
      let both = 0;
      for (let k = 0; k < masks.pocket.length; k++) if (masks.pocket[k] > ON && masks[id][k] > ON) both++;
      if (both) warnings.push(`pocket overlaps ${id} by ${both.toLocaleString("en")} px`);
    }

  // mannequin.png: mostly outside the shirt
  const man = await layer("mannequin", config.layers.mannequin);
  if (man && body) {
    let inside = 0;
    for (let i = 0; i < W * H; i++) if (man.data[i * 4 + 3] > 230 && body[i] > ON) inside++;
    if (inside > MANNEQUIN_INSIDE_BODY_MAX) errors.push(`mannequin.png: ${inside.toLocaleString("en")} opaque pixels inside mask-body (max ${MANNEQUIN_INSIDE_BODY_MAX})`);
    else oks.push(`mannequin.png: ${inside.toLocaleString("en")} opaque pixels inside mask-body (max ${MANNEQUIN_INSIDE_BODY_MAX})`);
  }

  // Details: listed files load; the zipper only belongs to the zip folder
  for (const d of config.details) await layer("details", d.file);
  const files = await readdir(dir);
  if (files.includes("details-zipper.png") && config.closure !== "zip") errors.push("details-zipper.png is in a folder that isn't the zip closure");
  if (config.closure === "zip" && !config.details.some((d) => d.file === "details-zipper.png")) errors.push("zip closure but details-zipper.png isn't listed in details");

  // Logo zones: ≥99% on the target part, clear of the avoid parts
  const maskOf = (id) => (id === "body" ? body : masks[id]);
  for (const z of config.zones ?? []) {
    const target = maskOf(z.target);
    if (!target) {
      errors.push(`zone ${z.id}: target "${z.target}" has no mask`);
      continue;
    }
    const cx = z.x + z.w / 2, cy = z.y + z.h / 2, a = ((z.rotation ?? 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    const at = (m, x, y) => {
      const xi = Math.round(x), yi = Math.round(y);
      return xi >= 0 && yi >= 0 && xi < W && yi < H && m[yi * W + xi] > ON;
    };
    let n = 0, inside = 0;
    const clash = Object.fromEntries((z.avoid ?? []).map((id) => [id, 0]));
    for (let v = -z.h / 2 + 0.5; v < z.h / 2; v++)
      for (let u = -z.w / 2 + 0.5; u < z.w / 2; u++, n++) {
        const x = cx + u * cos - v * sin, y = cy + u * sin + v * cos;
        if (at(target, x, y)) inside++;
        for (const id of z.avoid ?? []) if (maskOf(id) && at(maskOf(id), x, y)) clash[id]++;
      }
    const problems = [];
    if (inside / n < ZONE_INSIDE_MIN) problems.push(`only ${((inside / n) * 100).toFixed(1)}% on ${z.target} (needs 99%)`);
    for (const [id, c] of Object.entries(clash)) if (c) problems.push(`overlaps ${id} by ${c} px`);
    const where = `centre (${cx}, ${cy}), ${z.w}×${z.h} px, max ${z.maxCm?.w}×${z.maxCm?.h} cm`;
    if (problems.length) errors.push(`zone ${z.id} (${where}): ${problems.join("; ")}`);
    else oks.push(`zone ${z.id.padEnd(12)} ${where}: ${((inside / n) * 100).toFixed(1)}% on ${z.target}, clear of ${(z.avoid ?? []).join(", ") || "—"}`);
  }
  return { errors, warnings, oks };
}

/** Validate a family.json: every folder it names has a template, mirrored zones have a source */
export async function checkMannequinFamily(root) {
  const errors = [], oks = [];
  let fam;
  try {
    fam = JSON.parse(await readFile(path.join(root, "family.json"), "utf8"));
  } catch (e) {
    return { errors: [`family.json: ${e.message}`], oks };
  }
  const folders = [...Object.values(fam.views?.front ?? {}), fam.views?.back, ...Object.values(fam.views?.["side-left"] ?? {})].filter(Boolean);
  for (const f of folders) {
    if (!(await exists(path.join(root, f, "template.json")))) errors.push(`family.json names "${f}" but ${f}/template.json is missing`);
  }
  if (fam.views?.["side-right"]?.mirrorOf !== "side-left") errors.push('views.side-right must be { "mirrorOf": "side-left" }');
  const side = fam.views?.["side-left"]?.noArm;
  if (side && (await exists(path.join(root, side, "template.json")))) {
    const t = JSON.parse(await readFile(path.join(root, side, "template.json"), "utf8"));
    for (const [id, m] of Object.entries(fam.mirroredZones ?? {})) {
      const src = t.zones.find((z) => z.id === m.from);
      if (!src) errors.push(`mirroredZones.${id}: source zone "${m.from}" not in ${side}`);
      else {
        const cx = t.width - (src.x + src.w / 2);
        oks.push(`virtual side-right: zone ${id} = mirror of ${m.from}, centre (${cx}, ${src.y + src.h / 2})`);
      }
    }
  }
  if (!errors.length) oks.push(`family.json: ${folders.length} view folders + side-right mirror`);
  return { errors, oks };
}

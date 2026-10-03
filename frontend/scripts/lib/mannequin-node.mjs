// Node-side loader + renderer for the mannequin templates. Reads layers with sharp into the same
// shape the browser loader produces (MannequinLayers), then renders with the SHARED core.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { parseMannequinFamily, parseMannequinTemplate, resolveView, zonesFor } from "../../src/lib/mockup/mannequin.ts";
import { composite, flipHorizontal } from "../../src/lib/mockup/core/composite.ts";
import { assembleComposite } from "../../src/lib/mockup/core/assemble.ts";

export const MANNEQUIN_ROOT = path.resolve(import.meta.dirname, "..", "..", "public", "mockups", "mannequin");

async function rgbaOf(file, W, H) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`${file} is ${info.width}×${info.height}, expected ${W}×${H}`);
  return new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
}
const channel = (rgba, c) => {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + c];
  return out;
};

export function loadFamily(root = MANNEQUIN_ROOT) {
  return parseMannequinFamily(JSON.parse(fs.readFileSync(path.join(root, "family.json"), "utf8")));
}

const cache = new Map();
/** Every layer of a view folder, mirrored for the virtual side-right view */
export async function loadLayers(folder, mirrored, root = MANNEQUIN_ROOT) {
  const key = `${root}/${folder}:${mirrored}`;
  if (cache.has(key)) return cache.get(key);
  const dir = path.join(root, folder);
  const config = parseMannequinTemplate(JSON.parse(fs.readFileSync(path.join(dir, "template.json"), "utf8")), `${folder}/template.json`);
  const { width: W, height: H } = config;
  const load = async (f) => {
    const px = await rgbaOf(path.join(dir, f), W, H);
    return mirrored ? flipHorizontal(px, W, H, 4) : px;
  };
  const shadingFiles = [config.layers.base, ...(config.variants?.pocket ? [config.variants.pocket.base] : [])];
  const maskFiles = [...config.regions.map((r) => r.mask), config.trims.single, config.trims.doubleA, config.trims.doubleB];
  const layers = {
    config,
    mannequin: await load(config.layers.mannequin),
    details: await Promise.all(config.details.map((d) => load(d.file))),
    shading: Object.fromEntries(await Promise.all(shadingFiles.map(async (f) => [f, channel(await load(f), 0)]))),
    masks: Object.fromEntries(await Promise.all(maskFiles.map(async (f) => [f, channel(await load(f), 3)]))),
  };
  cache.set(key, layers);
  return layers;
}

/**
 * Render a design with the shared core.
 * design: { view, closure, pocket, trimStyle, colours, trim1, trim2, logo?: { rgba, w, h, zoneId, scale }, dilateParts? }
 * Returns { rgba, width, height, config, layers, zones, ms }.
 */
export async function renderDesign(design, root = MANNEQUIN_ROOT) {
  const family = loadFamily(root);
  const { folder, mirrored } = resolveView(family, design);
  const layers = await loadLayers(folder, mirrored, root);
  // design.dilateParts overrides the template flag (for before/after comparisons)
  const config = { ...layers.config, dilateParts: design.dilateParts ?? layers.config.dilateParts };
  const zones = zonesFor(family, layers.config, mirrored);
  let logo = null;
  if (design.logo) {
    const zone = zones.find((z) => z.id === design.logo.zoneId);
    if (!zone) throw new Error(`zone ${design.logo.zoneId} not in ${folder}${mirrored ? " (mirrored)" : ""}`);
    logo = { rgba: design.logo.rgba, w: design.logo.w, h: design.logo.h, zone, scale: design.logo.scale ?? 1 };
  }
  const t0 = performance.now();
  const input = assembleComposite(config, layers, {
    options: { view: design.view, closure: design.closure ?? "buttons", pocket: !!design.pocket, trimStyle: design.trimStyle ?? "none" },
    colours: design.colours ?? {},
    trim1: design.trim1 ?? "#f5f5f2",
    trim2: design.trim2 ?? design.trim1 ?? "#f5f5f2",
    logo,
    background: design.background ?? null, // transparent unless an export needs a solid colour
  });
  const rgba = composite(input);
  const ms = performance.now() - t0;
  return { rgba, width: config.width, height: config.height, config, layers, zones, folder, mirrored, ms };
}

export const savePng = (rgba, width, height, file) =>
  sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.length), { raw: { width, height, channels: 4 } }).png().toFile(file);

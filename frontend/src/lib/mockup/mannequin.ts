// Mannequin mockup templates (public/mockups/mannequin/): schema, parsing, variant selection and
// a browser loader. The ghost templates (types.ts / renderCanvas.ts) are separate and unchanged.
//
// Layer contract (see public/mockups/README.md):
//   mannequin.png  RGBA, drawn first, never recoloured
//   base.png       greyscale shading: R / shading.scale = multiplier S (200 = flat fabric); alpha ignored
//   mask-*.png     white RGB, coverage in ALPHA
//   trims          stripe masks drawn over collar + cuffs (overlap by design)
//   details        RGBA drawn last, never recoloured (zipper)

import type { LogoZone } from "./types";
import { flipHorizontal } from "./core/composite.ts";
import { decodePng } from "./pngDecode.ts";

export type MannequinRegionId = "body" | "yoke" | "pocket" | "sleeve" | "cuff" | "collar" | "placket" | "buttons";
/** Draw order of the regions (only those a template has and the options enable) */
export const REGION_ORDER: MannequinRegionId[] = ["body", "yoke", "pocket", "sleeve", "cuff", "collar", "placket", "buttons"];

export type MannequinView = "front" | "back" | "side-left" | "side-right";
export type Closure = "buttons" | "zip";
export type TrimStyle = "none" | "single" | "double";

export type MannequinRegion = {
  id: MannequinRegionId;
  label: string;
  mask: string;
  /** Hex colour when nothing is picked and there's nothing to inherit */
  default: string;
  inherit?: MannequinRegionId;
  /** Only present when these options hold (e.g. the pocket) */
  when?: { pocket?: boolean };
};

export type MannequinZone = LogoZone & {
  /** Largest print size here, in cm (brochure limits); the finishing limit may be smaller */
  maxCm: { w: number; h: number };
  /** The part the logo is stitched onto */
  target: MannequinRegionId;
  /** Parts the zone must not overlap */
  avoid: MannequinRegionId[];
};

export type MannequinTemplateConfig = {
  version: 2;
  style: "mannequin";
  family: string;
  id: string;
  view: Exclude<MannequinView, "side-right">;
  closure?: Closure;
  width: number;
  height: number;
  groundShadow: boolean;
  /** Grow part masks (not trims) 1 px where the body alpha > 0.3, at load time (see core dilateWithinBody) */
  dilateParts: boolean;
  pxPerCm: number;
  pxPerCmNote?: string;
  layers: { base: string; mannequin: string };
  /** gainBase/gainDark/grain present: contrast shading + fabric grain (core shadeColourContrast) */
  shading: {
    scale: number;
    foldStrength: number;
    gainBase?: number;
    gainDark?: number;
    grain?: { amp: number; ampDark: number; sigma: number; seed: number };
  };
  variants?: { pocket?: { base: string } };
  regions: MannequinRegion[];
  trims: { single: string; doubleA: string; doubleB: string };
  details: { file: string }[];
  zones: MannequinZone[];
};

export type MannequinFamily = {
  version: 1;
  family: string;
  style: "mannequin";
  views: {
    front: Record<Closure, string>;
    back: string;
    "side-left": { noArm: string; arm: string };
    "side-right": { mirrorOf: "side-left" };
  };
  sideShowsArm: boolean;
  mirroredZones: Record<string, { from: string; label: string }>;
  prices: {
    closure: Record<Closure, number>;
    pocket: { no: number; yes: number };
    trimStyle: Record<TrimStyle, number>;
  };
};

/** The customer's mannequin options (colours are separate) */
export type MannequinOptions = {
  view: MannequinView;
  closure: Closure;
  pocket: boolean;
  trimStyle: TrimStyle;
};

// ---- Runtime parsing (template files are data; fail loudly on a bad one) --------------------

const fail = (where: string, msg: string): never => {
  throw new Error(`${where}: ${msg}`);
};
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (o: Record<string, unknown>, k: string, where: string) =>
  typeof o[k] === "string" ? (o[k] as string) : fail(where, `"${k}" must be a string`);
const num = (o: Record<string, unknown>, k: string, where: string) =>
  typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : fail(where, `"${k}" must be a number`);
const REGION_IDS = new Set<string>(REGION_ORDER);
const regionId = (v: unknown, where: string): MannequinRegionId =>
  typeof v === "string" && REGION_IDS.has(v) ? (v as MannequinRegionId) : fail(where, `unknown region "${String(v)}"`);

export function parseMannequinTemplate(raw: unknown, where = "template.json"): MannequinTemplateConfig {
  if (!isObj(raw)) return fail(where, "not an object");
  if (raw.version !== 2) fail(where, "version must be 2");
  if (raw.style !== "mannequin") fail(where, 'style must be "mannequin"');
  const view = str(raw, "view", where);
  if (!["front", "back", "side-left"].includes(view)) fail(where, `bad view "${view}"`);
  const closure = raw.closure === undefined ? undefined : str(raw, "closure", where);
  if (closure !== undefined && closure !== "buttons" && closure !== "zip") fail(where, `bad closure "${closure}"`);
  const layers = isObj(raw.layers) ? raw.layers : fail(where, "layers missing");
  const shading = isObj(raw.shading) ? raw.shading : fail(where, "shading missing");
  const trims = isObj(raw.trims) ? raw.trims : fail(where, "trims missing");
  const variants = raw.variants === undefined ? undefined : isObj(raw.variants) ? raw.variants : fail(where, "variants must be an object");
  const pocketVariant = variants && isObj(variants.pocket) ? { base: str(variants.pocket, "base", `${where} variants.pocket`) } : undefined;

  const regions = (Array.isArray(raw.regions) ? raw.regions : fail(where, "regions missing")).map((r, i): MannequinRegion => {
    const w = `${where} regions[${i}]`;
    if (!isObj(r)) return fail(w, "not an object");
    const when = r.when === undefined ? undefined : isObj(r.when) ? { pocket: r.when.pocket === true } : fail(w, "when must be an object");
    return {
      id: regionId(r.id, w),
      label: str(r, "label", w),
      mask: str(r, "mask", w),
      default: str(r, "default", w),
      inherit: r.inherit === undefined ? undefined : regionId(r.inherit, w),
      when,
    };
  });
  if (!regions.some((r) => r.id === "body")) fail(where, 'no "body" region');

  const zones = (Array.isArray(raw.zones) ? raw.zones : fail(where, "zones missing")).map((z, i): MannequinZone => {
    const w = `${where} zones[${i}]`;
    if (!isObj(z)) return fail(w, "not an object");
    const maxCm = isObj(z.maxCm) ? z.maxCm : fail(w, "maxCm missing");
    return {
      id: str(z, "id", w) as LogoZone["id"],
      label: str(z, "label", w),
      x: num(z, "x", w),
      y: num(z, "y", w),
      w: num(z, "w", w),
      h: num(z, "h", w),
      rotation: num(z, "rotation", w),
      maxCm: { w: num(maxCm, "w", w), h: num(maxCm, "h", w) },
      target: regionId(z.target, w),
      avoid: (Array.isArray(z.avoid) ? z.avoid : fail(w, "avoid must be an array")).map((a) => regionId(a, w)),
    };
  });

  const details = (Array.isArray(raw.details) ? raw.details : fail(where, "details must be an array")).map((d, i) =>
    isObj(d) ? { file: str(d, "file", `${where} details[${i}]`) } : fail(`${where} details[${i}]`, "not an object")
  );

  return {
    version: 2,
    style: "mannequin",
    family: str(raw, "family", where),
    id: str(raw, "id", where),
    view: view as MannequinTemplateConfig["view"],
    closure: closure as Closure | undefined,
    width: num(raw, "width", where),
    height: num(raw, "height", where),
    groundShadow: raw.groundShadow === true,
    dilateParts: raw.dilateParts === true,
    pxPerCm: num(raw, "pxPerCm", where),
    pxPerCmNote: typeof raw.pxPerCmNote === "string" ? raw.pxPerCmNote : undefined,
    layers: { base: str(layers, "base", `${where} layers`), mannequin: str(layers, "mannequin", `${where} layers`) },
    shading: {
      scale: num(shading, "scale", `${where} shading`),
      foldStrength: num(shading, "foldStrength", `${where} shading`),
      ...(shading.gainBase === undefined
        ? {}
        : { gainBase: num(shading, "gainBase", `${where} shading`), gainDark: num(shading, "gainDark", `${where} shading`) }),
      ...(isObj(shading.grain)
        ? {
            grain: {
              amp: num(shading.grain, "amp", `${where} shading.grain`),
              ampDark: num(shading.grain, "ampDark", `${where} shading.grain`),
              sigma: num(shading.grain, "sigma", `${where} shading.grain`),
              seed: num(shading.grain, "seed", `${where} shading.grain`),
            },
          }
        : {}),
    },
    variants: pocketVariant ? { pocket: pocketVariant } : undefined,
    regions,
    trims: { single: str(trims, "single", `${where} trims`), doubleA: str(trims, "doubleA", `${where} trims`), doubleB: str(trims, "doubleB", `${where} trims`) },
    details,
    zones,
  };
}

export function parseMannequinFamily(raw: unknown, where = "family.json"): MannequinFamily {
  if (!isObj(raw) || raw.version !== 1 || raw.style !== "mannequin") return fail(where, "not a version 1 mannequin family");
  const views = isObj(raw.views) ? raw.views : fail(where, "views missing");
  const front = isObj(views.front) ? views.front : fail(where, "views.front missing");
  const side = isObj(views["side-left"]) ? views["side-left"] : fail(where, "views.side-left missing");
  const right = isObj(views["side-right"]) ? views["side-right"] : fail(where, "views.side-right missing");
  if (right.mirrorOf !== "side-left") fail(where, 'views.side-right must be { "mirrorOf": "side-left" }');
  const mz = isObj(raw.mirroredZones) ? raw.mirroredZones : {};
  const prices = isObj(raw.prices) ? raw.prices : fail(where, "prices missing");
  const p = (k: string) => (isObj(prices[k]) ? (prices[k] as Record<string, unknown>) : fail(where, `prices.${k} missing`));
  return {
    version: 1,
    family: str(raw, "family", where),
    style: "mannequin",
    views: {
      front: { buttons: str(front, "buttons", where), zip: str(front, "zip", where) },
      back: str(views, "back", where),
      "side-left": { noArm: str(side, "noArm", where), arm: str(side, "arm", where) },
      "side-right": { mirrorOf: "side-left" },
    },
    sideShowsArm: raw.sideShowsArm === true,
    mirroredZones: Object.fromEntries(
      Object.entries(mz).map(([id, v]) => [id, isObj(v) ? { from: str(v, "from", where), label: str(v, "label", where) } : fail(where, `mirroredZones.${id}`)])
    ),
    prices: {
      closure: { buttons: num(p("closure"), "buttons", where), zip: num(p("closure"), "zip", where) },
      pocket: { no: num(p("pocket"), "no", where), yes: num(p("pocket"), "yes", where) },
      trimStyle: { none: num(p("trimStyle"), "none", where), single: num(p("trimStyle"), "single", where), double: num(p("trimStyle"), "double", where) },
    },
  };
}

// ---- Variant selection (brief section 4) -----------------------------------------------------

export type ResolvedView = {
  /** Folder under public/mockups/mannequin/ */
  folder: string;
  /** Flip every layer horizontally (virtual side-right) */
  mirrored: boolean;
};

/** Which asset folder a view + options uses */
export function resolveView(family: MannequinFamily, o: Pick<MannequinOptions, "view" | "closure">): ResolvedView {
  if (o.view === "front") return { folder: family.views.front[o.closure], mirrored: false };
  if (o.view === "back") return { folder: family.views.back, mirrored: false };
  const side = family.sideShowsArm ? family.views["side-left"].arm : family.views["side-left"].noArm;
  return { folder: side, mirrored: o.view === "side-right" };
}

/** The shading file for a template + options: base-pocket.png when the pocket is on (front views) */
export const shadingFile = (t: MannequinTemplateConfig, o: Pick<MannequinOptions, "pocket">) =>
  o.pocket && t.variants?.pocket ? t.variants.pocket.base : t.layers.base;

/** Regions drawn for these options, in draw order (pocket only when on; the rest as the template has them) */
export const activeRegions = (t: MannequinTemplateConfig, o: Pick<MannequinOptions, "pocket">) =>
  REGION_ORDER.flatMap((id) => t.regions.filter((r) => r.id === id && (r.when?.pocket === undefined || r.when.pocket === o.pocket)));

/** Trim masks drawn for a trim style: [mask file, which trim colour] in draw order */
export function activeTrims(t: MannequinTemplateConfig, style: TrimStyle): [string, "trim1" | "trim2"][] {
  if (style === "single") return [[t.trims.single, "trim1"]];
  if (style === "double") return [[t.trims.doubleA, "trim1"], [t.trims.doubleB, "trim2"]];
  return [];
}

/** A zone mirrored for the virtual side-right view: x' = width - (x + w), rotation negated */
export const mirrorZone = <Z extends LogoZone>(z: Z, width: number, id?: Z["id"], label?: string): Z => ({
  ...z,
  id: id ?? z.id,
  label: label ?? z.label,
  x: width - (z.x + z.w),
  rotation: -z.rotation,
});

/** The zones a view offers: the template's own, or (side-right) the mirrored side-left ones */
export function zonesFor(family: MannequinFamily, t: MannequinTemplateConfig, mirrored: boolean): MannequinZone[] {
  if (!mirrored) return t.zones;
  return Object.entries(family.mirroredZones).flatMap(([id, m]) => {
    const src = t.zones.find((z) => z.id === m.from);
    return src ? [mirrorZone(src, t.width, id as MannequinZone["id"], m.label)] : [];
  });
}

// ---- Browser loader: layers as typed arrays, ready for the compositing core ------------------

export type MannequinLayers = {
  config: MannequinTemplateConfig;
  /** mannequin.png and details, RGBA */
  mannequin: Uint8ClampedArray;
  details: Uint8ClampedArray[];
  /** Shading multipliers' source: base R channel, per variant file */
  shading: Record<string, Uint8Array>;
  /** Mask alpha per file (regions and trims) */
  masks: Record<string, Uint8Array>;
};

const MANNEQUIN_ROOT = "/mockups/mannequin";

/**
 * A layer's exact pixels (decoded without a canvas: see pngDecode.ts), mirrored if asked.
 * Identical to what sharp reads in Node, so browser and Node renders match byte for byte.
 */
async function pixels(url: string, w: number, h: number, mirrored: boolean): Promise<Uint8ClampedArray> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const png = await decodePng(await res.arrayBuffer());
  if (png.width !== w || png.height !== h) throw new Error(`${url} is ${png.width}×${png.height}, expected ${w}×${h}`);
  return mirrored ? flipHorizontal(png.rgba, w, h, 4) : png.rgba;
}
const channel = (rgba: Uint8ClampedArray, c: number) => {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + c];
  return out;
};

const familyCache = new Map<string, Promise<MannequinFamily>>();
export function loadMannequinFamily(root = MANNEQUIN_ROOT) {
  let p = familyCache.get(root);
  if (!p) {
    p = fetch(`${root}/family.json`).then(async (r) => parseMannequinFamily(await r.json(), `${root}/family.json`));
    familyCache.set(root, p);
  }
  return p;
}

// Decoded layers, LRU by bytes: masks and shading are single-channel Uint8Array, only
// mannequin.png and details stay RGBA. One folder is ~23–37 MB decoded; the total is capped.
export const LAYER_CACHE_MAX_BYTES = 150 * 1024 * 1024;
type CacheEntry = { promise: Promise<MannequinLayers>; bytes: number };
const layerCache = new Map<string, CacheEntry>();

/** Decoded size of one folder's layers, in bytes */
export function layerBytes(l: MannequinLayers) {
  let n = l.mannequin.byteLength;
  for (const d of l.details) n += d.byteLength;
  for (const a of Object.values(l.shading)) n += a.byteLength;
  for (const a of Object.values(l.masks)) n += a.byteLength;
  return n;
}
export const layerCacheBytes = () => [...layerCache.values()].reduce((n, e) => n + e.bytes, 0);
export const layerCacheKeys = () => [...layerCache.keys()];

function evict(keep: string) {
  let total = layerCacheBytes();
  for (const [key, e] of layerCache) {
    if (total <= LAYER_CACHE_MAX_BYTES) break;
    if (key === keep || !e.bytes) continue; // never the one in use, nor one still loading
    layerCache.delete(key);
    total -= e.bytes;
  }
}

/**
 * The layers of one view folder, optionally mirrored. Loads mannequin, masks, details and the
 * default shading (base.png); the pocket shading is added on demand by ensureShading.
 */
export function loadMannequinLayers(folder: string, mirrored: boolean, root = MANNEQUIN_ROOT): Promise<MannequinLayers> {
  const key = `${root}/${folder}:${mirrored}`;
  const hit = layerCache.get(key);
  if (hit) {
    // Most recently used goes last
    layerCache.delete(key);
    layerCache.set(key, hit);
    return hit.promise;
  }
  const entry: CacheEntry = { bytes: 0, promise: Promise.resolve(null as unknown as MannequinLayers) };
  entry.promise = (async () => {
    const dir = `${root}/${folder}`;
    const config = parseMannequinTemplate(await (await fetch(`${dir}/template.json`)).json(), `${dir}/template.json`);
    const { width: W, height: H } = config;
    const load = (f: string) => pixels(`${dir}/${f}`, W, H, mirrored);
    const maskFiles = [...config.regions.map((r) => r.mask), config.trims.single, config.trims.doubleA, config.trims.doubleB];
    const [mannequin, details, base, masks] = await Promise.all([
      load(config.layers.mannequin),
      Promise.all(config.details.map((d) => load(d.file))),
      load(config.layers.base).then((px) => channel(px, 0)),
      Promise.all(maskFiles.map(async (f) => [f, channel(await load(f), 3)] as const)),
    ]);
    const layers: MannequinLayers = { config, mannequin, details, shading: { [config.layers.base]: base }, masks: Object.fromEntries(masks) };
    // Count the grown part masks the rim fix derives from these layers too (freed with them)
    const grownParts = config.dilateParts ? config.regions.filter((r) => r.id !== "body").length * W * H : 0;
    entry.bytes = layerBytes(layers) + grownParts;
    evict(key);
    return layers;
  })();
  entry.promise.catch(() => layerCache.delete(key));
  layerCache.set(key, entry);
  return entry.promise;
}

/** Make sure a shading variant (e.g. base-pocket.png) is decoded into these layers */
export async function ensureShading(layers: MannequinLayers, folder: string, mirrored: boolean, file: string, root = MANNEQUIN_ROOT) {
  if (layers.shading[file]) return;
  const { width: W, height: H } = layers.config;
  layers.shading[file] = channel(await pixels(`${root}/${folder}/${file}`, W, H, mirrored), 0);
  const e = layerCache.get(`${root}/${folder}:${mirrored}`);
  if (e) e.bytes += W * H;
}

/**
 * Warm the cache for the other views while the browser is idle, unless the visitor asked to save
 * data. Loads one folder at a time and stops before the cache nears its cap.
 */
export function prefetchMannequinViews(family: MannequinFamily, closure: Closure, root = MANNEQUIN_ROOT) {
  const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: { saveData?: boolean } });
  if (!nav || nav.connection?.saveData) return () => {};
  const side = family.sideShowsArm ? family.views["side-left"].arm : family.views["side-left"].noArm;
  const queue: [string, boolean][] = [[family.views.front[closure], false], [family.views.back, false], [side, false], [side, true]];
  let cancelled = false;
  const idle = (cb: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : globalThis.setTimeout(cb, 1200));
  const next = () => {
    if (cancelled) return;
    const item = queue.shift();
    if (!item || layerCacheBytes() > LAYER_CACHE_MAX_BYTES * 0.8) return;
    loadMannequinLayers(item[0], item[1], root)
      .catch(() => {})
      .then(() => idle(next));
  };
  idle(next);
  return () => {
    cancelled = true;
  };
}

// Turns a mannequin template + its loaded layers + the design state into the compositing core's
// input. Pure (type-only imports), shared by the browser renderer, Node tests and batch script.
import type { CompositeInput, PaintLayer, RGB } from "./composite";
import type { MannequinLayers, MannequinOptions, MannequinRegionId, MannequinTemplateConfig, MannequinZone } from "../mannequin";
// Runtime imports inside core/ carry the .ts extension so Node can run the core directly
import { dilateWithinBody, fitLogo, maskBounds } from "./composite.ts";

/** Page / card colour for exports without alpha (the ghost templates' background); the
 * mannequin renders are transparent unless a background is asked for */
export const EXPORT_BACKGROUND: RGB = [0xf5, 0xf5, 0xf5];
/** How much of the fabric's folds the logo takes on (the ghost renderer's light multiply) */
export const LOGO_SHADE_STRENGTH = 0.2;

const REGION_ORDER: MannequinRegionId[] = ["body", "yoke", "pocket", "sleeve", "cuff", "collar", "placket", "buttons"];

export type MannequinColours = Partial<Record<MannequinRegionId, string>>;

export type MannequinRenderState = {
  options: MannequinOptions;
  /** Picked hex per region; unpicked regions inherit (template `inherit`) or use their default */
  colours: MannequinColours;
  /** Stripe colours (hex): trim1 = single / outer, trim2 = inner */
  trim1: string;
  trim2: string;
  logo?: { rgba: Uint8ClampedArray; w: number; h: number; zone: MannequinZone; scale: number } | null;
  /** null / omitted: transparent. A colour only for formats without alpha. */
  background?: RGB | null;
};

export const hexToRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Colour (hex) of every region the template has, after inheritance and defaults */
export function resolveColours(t: MannequinTemplateConfig, picked: MannequinColours): Record<string, string> {
  const out: Record<string, string> = {};
  const get = (id: MannequinRegionId, depth = 0): string => {
    if (out[id]) return out[id];
    const r = t.regions.find((q) => q.id === id);
    const v = picked[id] ?? (r?.inherit && depth < 8 ? get(r.inherit, depth + 1) : undefined) ?? r?.default ?? "#f5f5f2";
    out[id] = v;
    return v;
  };
  for (const r of t.regions) get(r.id);
  return out;
}

// Bounds and dilated masks are costly to recompute; the mask arrays themselves are the cache keys
const boundsCache = new WeakMap<Uint8Array, readonly [number, number, number, number]>();
const dilatedCache = new WeakMap<Uint8Array, Uint8Array>();
const boundsOf = (m: Uint8Array, W: number, H: number) => {
  let b = boundsCache.get(m);
  if (!b) boundsCache.set(m, (b = maskBounds(m, W, H)));
  return b;
};

/** Parts (not body, not trims) whose masks get the 1 px body-rim fix when dilateParts is on */
const DILATE: MannequinRegionId[] = ["yoke", "pocket", "sleeve", "cuff", "collar", "placket", "buttons"];

export function assembleComposite(
  t: MannequinTemplateConfig,
  layers: MannequinLayers,
  s: MannequinRenderState
): CompositeInput {
  const { width: W, height: H } = t;
  const shadingFile = s.options.pocket && t.variants?.pocket ? t.variants.pocket.base : t.layers.base;
  const shading = layers.shading[shadingFile];
  if (!shading) throw new Error(`shading ${shadingFile} not loaded`);
  const body = layers.masks[t.regions.find((r) => r.id === "body")!.mask];
  const colours = resolveColours(t, s.colours);

  const paint: PaintLayer[] = [];
  for (const id of REGION_ORDER)
    for (const r of t.regions) {
      if (r.id !== id) continue;
      if (r.when?.pocket !== undefined && r.when.pocket !== s.options.pocket) continue;
      let mask = layers.masks[r.mask];
      if (!mask) throw new Error(`mask ${r.mask} not loaded`);
      if (t.dilateParts && DILATE.includes(id)) {
        let d = dilatedCache.get(mask);
        if (!d) dilatedCache.set(mask, (d = dilateWithinBody(mask, body, W, H)));
        mask = d;
      }
      paint.push({ mask, colour: hexToRgb(colours[r.id]), bounds: boundsOf(mask, W, H) });
    }
  const trims: [string, string][] =
    s.options.trimStyle === "single" ? [[t.trims.single, s.trim1]] : s.options.trimStyle === "double" ? [[t.trims.doubleA, s.trim1], [t.trims.doubleB, s.trim2]] : [];
  for (const [file, hex] of trims) {
    const mask = layers.masks[file];
    if (!mask) throw new Error(`trim ${file} not loaded`);
    paint.push({ mask, colour: hexToRgb(hex), bounds: boundsOf(mask, W, H) });
  }

  let logo: CompositeInput["logo"] = null;
  if (s.logo) {
    const fit = fitLogo(s.logo.zone, s.logo.w, s.logo.h, s.logo.scale);
    logo = {
      placed: { rgba: s.logo.rgba, w: s.logo.w, h: s.logo.h, ...fit, rotation: s.logo.zone.rotation, shadeStrength: LOGO_SHADE_STRENGTH },
      clip: body,
    };
  }

  return {
    width: W,
    height: H,
    background: s.background ?? null,
    mannequin: layers.mannequin,
    shading,
    shadingScale: t.shading.scale,
    foldStrength: t.shading.foldStrength,
    contrast: t.shading.gainBase === undefined ? null : { gainBase: t.shading.gainBase, gainDark: t.shading.gainDark, grain: t.shading.grain },
    layers: paint,
    logo,
    details: layers.details,
  };
}

/** Left chest is under the pocket: unavailable while the pocket is on */
export const zoneDisabled = (zoneId: string, o: Pick<MannequinOptions, "pocket">) => o.pocket && zoneId === "left-chest";
export const POCKET_ZONE_NOTICE = "The pocket is on the left chest. Choose right chest or center chest.";

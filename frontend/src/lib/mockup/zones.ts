// Logo-zone maths shared by the canvas renderer and (mirrored in) scripts/generate-mockups.mjs.
import type { LogoOrientation, LogoZone, LogoZoneId, TemplateConfig } from "./types";

export const MIN_LOGO_SCALE = 0.5;
export const MAX_LOGO_SCALE = 1;

export const clampScale = (s: number) => Math.min(MAX_LOGO_SCALE, Math.max(MIN_LOGO_SCALE, s));

/** Starting size of a logo (fraction of its zone) when it's first placed or its zone changes */
export const DEFAULT_LOGO_SCALE = 0.6;
export const defaultScaleFor = (id: LogoZoneId) => (id.includes("sleeve") && !id.endsWith("-upper") ? 0.7 : DEFAULT_LOGO_SCALE);

/** The studio's existing positions map 1:1 onto chest zones */
export const POSITION_TO_ZONE: Record<"left-chest" | "center-chest" | "right-chest", LogoZoneId> = {
  "left-chest": "left-chest",
  "center-chest": "center-chest",
  "right-chest": "right-chest",
};

export const zoneById = (t: TemplateConfig, id: LogoZoneId) => t.zones.find((z) => z.id === id) ?? null;

/** Upper-sleeve zones can be turned: "along" runs the logo down the sleeve, "upright" stands it up */
export const hasOrientation = (id: LogoZoneId) => id.endsWith("-sleeve-upper");

/**
 * The zone a logo is actually placed in. "upright" on an upper-sleeve zone turns the zone 90°
 * back and swaps its width and height, so it covers the same patch of sleeve.
 */
export function placedZone(t: TemplateConfig, id: LogoZoneId, orientation: LogoOrientation = "along") {
  const z = zoneById(t, id);
  if (!z || orientation !== "upright" || !hasOrientation(id)) return z;
  const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
  return { ...z, x: cx - z.h / 2, y: cy - z.w / 2, w: z.h, h: z.w, rotation: z.rotation - 90 };
}

/**
 * The logo's box inside a zone: fitted keeping the logo's aspect ratio, scaled, and centred.
 * Coordinates are relative to the zone centre (the renderer translates + rotates there).
 */
export function fitLogo(zone: LogoZone, logoW: number, logoH: number, scale: number) {
  const s = clampScale(scale);
  const k = Math.min(zone.w / logoW, zone.h / logoH) * s;
  const w = logoW * k * (zone.scaleX ?? 1), h = logoH * k;
  return { w, h, x: -w / 2, y: -h / 2, cx: zone.x + zone.w / 2, cy: zone.y + zone.h / 2 };
}

/** Real-world size of the fitted logo (for finishing limits / pricing) */
export function logoSizeCm(t: TemplateConfig, zone: LogoZone, logoW: number, logoH: number, scale: number) {
  const { w, h } = fitLogo(zone, logoW, logoH, scale);
  return { w: w / t.pxPerCm, h: h / t.pxPerCm };
}

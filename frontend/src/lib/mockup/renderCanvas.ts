// Client-side ghost-mannequin mockup renderer (plain Canvas 2D).
//
// Template = base.png (the garment in WHITE on a ghost mannequin, transparent background)
// + one alpha mask per recolourable part + template.json. See public/mockups/README.md.
//
// 1. soft off-white background (#f5f5f5) + a subtle ground shadow under the garment
// 2. per part: colour → multiply by base.png's luminance (folds/shadows)
//              → soft-light the luminance back in at `foldStrength`, so navy/black keep
//                visible folds instead of going flat (white can't clip: multiply never exceeds
//                the colour and soft-light over white stays white)
//              → clip to the part's mask, feathered ~0.5 px to avoid halos
// 3. details.png (optional, not recoloured)
// 4. logo fitted in its zone, luminance multiplied in so folds show, alpha restored;
//    embroidery gets a thin darker outline + slight emboss, print stays flat
//
// Speed: each part is tinted into its own bbox-sized canvas and cached by colour, so a
// colour change re-tints one part and re-composites.
import type { LogoPlacement, MockupState, RegionColours, RegionId, TemplateConfig, TemplateRegion } from "./types";
import { fitLogo, placedZone } from "./zones";
import { recolourReferencePixel, recolourFabricPixel, buttonProtection } from "./core/reference-colour";

export const BACKGROUND = "#f5f5f5";
const DEFAULT_FOLD_STRENGTH = 0.55;
const MASK_FEATHER_PX = 0.5;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Load (once) and cache an image; data URLs and same-origin URLs only */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(src);
        reject(new Error(`Could not load ${src.slice(0, 80)}`));
      };
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

type Box = { x: number; y: number; w: number; h: number };

type PreparedRegion = TemplateRegion & {
  /** The mask, feathered by ~0.5 px */
  maskCanvas: HTMLCanvasElement;
  box: Box;
  /** Last tint, reused while the colour is unchanged */
  cache?: { colour: string; canvas: HTMLCanvasElement };
};

export type PreparedTemplate = {
  source: HTMLImageElement;
  config: TemplateConfig;
  base: string;
  /** base.png as grayscale luminance, with base.png's alpha */
  lum: HTMLCanvasElement;
  /** Opaque bounds of the garment (for the ground shadow) */
  garmentBox: Box;
  details: HTMLImageElement | null;
  regions: PreparedRegion[];
};

/** Opaque bounding box of a canvas, padded for the feathered edge */
function alphaBox(c: HTMLCanvasElement): Box {
  const { data } = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (data[(y * c.width + x) * 4 + 3] > 4) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { x: 0, y: 0, w: 0, h: 0 };
  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  return { x: x0, y: y0, w: Math.min(c.width, x1 + pad + 1) - x0, h: Math.min(c.height, y1 + pad + 1) - y0 };
}

/** base.png → grayscale luminance canvas (alpha kept) */
function luminance(img: HTMLImageElement, W: number, H: number, shadingScale = 255) {
  const c = canvas(W, H);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const source = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const l = Math.min(255, Math.round(source * 255 / shadingScale));
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

/** Mask image → canvas, feathered so edges anti-alias without a halo */
function featherMask(img: HTMLImageElement, W: number, H: number) {
  const c = canvas(W, H);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  // ctx.filter is ignored where unsupported (older Safari); the mask is then used as exported
  ctx.filter = `blur(${MASK_FEATHER_PX}px)`;
  ctx.drawImage(img, 0, 0, W, H);
  ctx.filter = "none";
  return c;
}

const templateCache = new Map<string, Promise<PreparedTemplate | null>>();

/**
 * Load a garment template. Resolves to null when the folder, template.json or base.png is
 * missing, so callers fall back to the product photo.
 */
export function loadTemplate(type: string, root = "/mockups"): Promise<PreparedTemplate | null> {
  const base = `${root}/${type}`;
  let p = templateCache.get(base);
  if (!p) {
    p = (async () => {
      const res = await fetch(`${base}/template.json`);
      if (!res.ok) return null;
      const config = (await res.json()) as TemplateConfig;
      if (config.version !== 2) return null;
      const url = (f: string) => `${base}/${f}`;
      const [baseImg, details, masks] = await Promise.all([
        loadImage(url(config.layers.base)),
        config.layers.details ? loadImage(url(config.layers.details)).catch(() => null) : null,
        // A missing mask just hides that option for this garment type
        Promise.all(config.regions.map((r) => loadImage(url(r.mask)).catch(() => null))),
      ]);
      const { width: W, height: H } = config;
      const lum = luminance(baseImg, W, H, config.shadingScale);
      const regions: PreparedRegion[] = [];
      config.regions.forEach((r, i) => {
        const img = masks[i];
        if (!img) return;
        const maskCanvas = featherMask(img, W, H);
        regions.push({ ...r, maskCanvas, box: alphaBox(maskCanvas) });
      });
      return { config, base, source: baseImg, lum, garmentBox: alphaBox(lum), details, regions };
    })().catch(() => null);
    // Don't cache a miss forever: a template added later should show up on retry
    p.then((t) => !t && templateCache.delete(base));
    templateCache.set(base, p);
  }
  return p;
}

/** Parts this template can recolour (masks present) */
export const supportedRegions = (t: PreparedTemplate): RegionId[] => t.regions.map((r) => r.id);

/** Final colour per part: own colour → inherited part's colour → template default */
export function resolveColours(t: PreparedTemplate, colours: RegionColours): Record<string, string> {
  const byId = new Map(t.config.regions.map((r) => [r.id, r]));
  const resolve = (id: RegionId, depth = 0): string => {
    const r = byId.get(id);
    if (colours[id]) return colours[id]!;
    if (r?.inherit && depth < 5) return resolve(r.inherit, depth + 1);
    return r?.default ?? "#cccccc";
  };
  return Object.fromEntries(t.config.regions.map((r) => [r.id, resolve(r.id)]));
}

/** Tint one part: colour × luminance, + soft-light folds, clipped to its feathered mask */
function tintRegion(t: PreparedTemplate, r: PreparedRegion, colour: string) {
  if (r.cache?.colour === colour) return r.cache.canvas;
  const { x, y, w, h } = r.box;
  const c = r.cache?.canvas ?? canvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  if (t.config.referenceColour) {
    ctx.drawImage(t.source, x, y, w, h, 0, 0, w, h);
    const parse = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    const reference = parse(t.config.referenceColour);
    const target = parse(colour);
    const buttonThreshold = reference[0] * 0.2126 + reference[1] * 0.7152 + reference[2] * 0.0722 + 29;
    const pixels = ctx.getImageData(0, 0, w, h);
    const mask = r.maskCanvas.getContext("2d")!.getImageData(x, y, w, h).data;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const index = (py * w + px) * 4;
      if (!pixels.data[index + 3]) continue;
      const source = [pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]];
      const recoloured = t.config.referenceRendering === "fabric"
        ? recolourFabricPixel(source, reference, target)
        : recolourReferencePixel(source, reference, target);
      const luminance = source[0] * 0.2126 + source[1] * 0.7152 + source[2] * 0.0722;
      let protection = 0;
      for (const detail of t.config.preserveDetails ?? []) {
        const distance = Math.hypot(px + x - detail.x, py + y - detail.y);
        if (distance < detail.radius) protection = Math.max(protection, buttonProtection(distance, detail.radius, luminance, buttonThreshold));
      }
      for (let channel = 0; channel < 3; channel++) {
        pixels.data[index + channel] = Math.round(recoloured[channel] * (1 - protection) + source[channel] * protection);
      }
      // Intersect coverage without multiplying alpha twice at the cutout edge.
      pixels.data[index + 3] = Math.min(pixels.data[index + 3], mask[index + 3]);
    }
    ctx.putImageData(pixels, 0, 0);
    // Preserve the original antialiased cutout while respecting the region mask.
    r.cache = { colour, canvas: c };
    return c;
  }
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(t.lum, x, y, w, h, 0, 0, w, h);
  // Multiply alone flattens dark colours (navy × fold ≈ navy); soft-light brings the folds back
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = t.config.foldStrength ?? DEFAULT_FOLD_STRENGTH;
  ctx.drawImage(t.lum, x, y, w, h, 0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(r.maskCanvas, x, y, w, h, 0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  r.cache = { colour, canvas: c };
  return c;
}

/** A soft elliptical shadow on the "floor" under the garment */
function drawGroundShadow(ctx: CanvasRenderingContext2D, t: PreparedTemplate) {
  const { x, y, w, h } = t.garmentBox;
  if (!w) return;
  const cx = x + w / 2, cy = Math.min(t.config.height - 4, y + h + h * 0.015);
  const rx = w * 0.42, ry = Math.max(6, h * 0.025);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, "rgba(0,0,0,0.16)");
  g.addColorStop(0.6, "rgba(0,0,0,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The logo with fabric folds multiplied in and its own alpha restored */
function shadeLogo(t: PreparedTemplate, logo: HTMLImageElement, placement: LogoPlacement) {
  const zone = placedZone(t.config, placement.zone, placement.orientation);
  if (!zone || (zone.finishes && !zone.finishes.includes(placement.finish))) return null;
  const lw = logo.naturalWidth || logo.width || 1;
  const lh = logo.naturalHeight || logo.height || 1;
  const fit = fitLogo(zone, lw, lh, placement.scale);
  const c = canvas(fit.w, fit.h);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(logo, 0, 0, c.width, c.height);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  // Light touch: just enough for folds to show, so the logo keeps its uploaded colours
  ctx.globalAlpha = 0.2;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((-zone.rotation * Math.PI) / 180);
  ctx.translate(-fit.cx, -fit.cy);
  ctx.drawImage(t.lum, 0, 0);
  ctx.restore();
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(logo, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  return { canvas: c, fit, rotation: zone.rotation };
}

function drawLogo(ctx: CanvasRenderingContext2D, t: PreparedTemplate, logo: HTMLImageElement, placement: LogoPlacement) {
  const shaded = shadeLogo(t, logo, placement);
  if (!shaded) return;
  const { canvas: art, fit, rotation } = shaded;
  ctx.save();
  ctx.translate(fit.cx, fit.cy);
  ctx.rotate((rotation * Math.PI) / 180);
  if (placement.finish === "embroidery") {
    // Thread stands slightly off the fabric: a soft contact shadow only (no outline around the logo)
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 1.5;
    ctx.shadowOffsetX = 0.6;
    ctx.shadowOffsetY = 0.9;
  }
  ctx.drawImage(art, fit.x, fit.y, fit.w, fit.h);
  ctx.restore();
}

// Distinct translucent colours for ?debug=masks
const DEBUG_COLOURS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c"];

/**
 * Outline each mask in its own colour, labelled, to check alignment. Outlines only (no fill),
 * so the colours chosen for each part stay visible underneath.
 */
function drawMaskDebug(ctx: CanvasRenderingContext2D, t: PreparedTemplate) {
  const EDGE = 3; // outline width in template px
  t.regions.forEach((r, i) => {
    const colour = DEBUG_COLOURS[i % DEBUG_COLOURS.length];
    const { x, y, w, h } = r.box;
    // The mask shrunk by EDGE px: intersection of the mask shifted in four directions
    const inner = canvas(w, h);
    const ix = inner.getContext("2d")!;
    ix.drawImage(r.maskCanvas, x, y, w, h, 0, 0, w, h);
    ix.globalCompositeOperation = "destination-in";
    for (const [dx, dy] of [[EDGE, 0], [-EDGE, 0], [0, EDGE], [0, -EDGE]])
      ix.drawImage(r.maskCanvas, x, y, w, h, dx, dy, w, h);
    // Outline = mask minus its shrunk self, filled with the part's debug colour
    const c = canvas(w, h);
    const cx = c.getContext("2d")!;
    cx.drawImage(r.maskCanvas, x, y, w, h, 0, 0, w, h);
    cx.globalCompositeOperation = "destination-out";
    cx.drawImage(inner, 0, 0);
    cx.globalCompositeOperation = "source-in";
    cx.fillStyle = colour;
    cx.fillRect(0, 0, w, h);
    ctx.drawImage(c, x, y);
    // Legend, top-left
    const fs = Math.round(t.config.width / 45);
    ctx.font = `600 ${fs}px sans-serif`;
    ctx.fillStyle = colour;
    ctx.fillRect(fs, fs + i * fs * 1.5, fs, fs);
    ctx.fillStyle = "#111";
    ctx.fillText(r.id, fs * 2.4, fs * 1.85 + i * fs * 1.5);
  });
  // Logo zones: dashed box with a white halo (readable on any garment colour), centre cross, label
  const fs = Math.round(t.config.width / 70);
  for (const z of t.config.zones) {
    ctx.save();
    ctx.translate(z.x + z.w / 2, z.y + z.h / 2);
    ctx.rotate(((z.rotation ?? 0) * Math.PI) / 180);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeRect(-z.w / 2, -z.h / 2, z.w, z.h);
    ctx.setLineDash([8, 5]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#ff00aa";
    ctx.strokeRect(-z.w / 2, -z.h / 2, z.w, z.h);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.stroke();
    ctx.font = `600 ${fs}px sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText(z.id, 0, -z.h / 2 - fs * 0.5);
    ctx.fillStyle = "#ff00aa";
    ctx.fillText(z.id, 0, -z.h / 2 - fs * 0.5);
    ctx.restore();
  }
}

// Reused offscreen canvas for partition templates (one per template, template size)
const garmentCanvases = new WeakMap<PreparedTemplate, HTMLCanvasElement>();
function garmentCanvas(t: PreparedTemplate) {
  let c = garmentCanvases.get(t);
  if (!c) garmentCanvases.set(t, (c = canvas(t.config.width, t.config.height)));
  return c;
}

export type RenderOptions = { debugMasks?: boolean; background?: string | null };

/**
 * Render synchronously into `target` (created if omitted) at the template's native size.
 * `logoImg` must already be loaded (see loadImage) when `state.logo` is set.
 */
export function renderMockup(
  t: PreparedTemplate,
  state: MockupState,
  logoImg?: HTMLImageElement | null,
  target?: HTMLCanvasElement,
  opts: RenderOptions = {}
): HTMLCanvasElement {
  const { width: W, height: H } = t.config;
  const out = target ?? canvas(W, H);
  if (out.width !== W) out.width = W;
  if (out.height !== H) out.height = H;
  const ctx = out.getContext("2d")!;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);
  const bg = opts.background === undefined ? BACKGROUND : opts.background;
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    drawGroundShadow(ctx, t);
  }
  const colours = resolveColours(t, state.colours);
  if (t.config.masks === "partition") {
    // Partition masks meet with soft edges whose alphas sum to 1 (e.g. 0.5 + 0.5). Stacking them
    // source-over leaves 0.5 + 0.5·0.5 = 0.75 there, so the background shows through as a light
    // line along every seam. Adding them ("lighter" on premultiplied colour) restores full alpha
    // and the right colour; the finished garment then goes over the background in one piece.
    const g = garmentCanvas(t);
    const gx = g.getContext("2d")!;
    gx.globalCompositeOperation = "source-over";
    gx.clearRect(0, 0, W, H);
    gx.globalCompositeOperation = "lighter";
    for (const r of t.regions) gx.drawImage(tintRegion(t, r, colours[r.id]), r.box.x, r.box.y);
    gx.globalCompositeOperation = "source-over";
    ctx.drawImage(g, 0, 0);
  } else for (const r of t.regions) ctx.drawImage(tintRegion(t, r, colours[r.id]), r.box.x, r.box.y);
  if (t.details) ctx.drawImage(t.details, 0, 0, W, H);
  if (state.logo && logoImg) drawLogo(ctx, t, logoImg, state.logo);
  if (opts.debugMasks) drawMaskDebug(ctx, t);
  return out;
}

/** One-off render (share images, cart previews): loads everything first */
export async function renderMockupToDataURL(type: string, state: MockupState, mime = "image/webp", quality = 0.85) {
  const t = await loadTemplate(type);
  if (!t) return null;
  const logo = state.logo ? await loadImage(state.logo.src).catch(() => null) : null;
  return renderMockup(t, state, logo).toDataURL(mime, quality);
}

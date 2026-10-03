// Browser renderer for the mannequin templates: loads the layers (mannequin.ts), runs the SHARED
// compositing core (core/*.ts) and paints the result on a canvas. Only used for templates that
// have `shading.scale`; the ghost templates keep renderCanvas.ts, unchanged.
import { assembleComposite, zoneDisabled, type MannequinColours } from "./core/assemble";
import { composite, hashRgba } from "./core/composite";
import { PLACEMENTS } from "./mannequinState";
import {
  ensureShading,
  loadMannequinFamily,
  loadMannequinLayers,
  resolveView,
  zonesFor,
  type MannequinLayers,
  type MannequinOptions,
  type MannequinTemplateConfig,
  type MannequinZone,
} from "./mannequin";

/** A mannequin template is recognised by its shading block (the ghost templates have none) */
export const isMannequinTemplate = (config: unknown): config is MannequinTemplateConfig =>
  typeof (config as { shading?: { scale?: unknown } } | null)?.shading?.scale === "number";

export type MannequinDesign = {
  options: MannequinOptions;
  colours: MannequinColours;
  trim1: string;
  trim2: string;
  /** Uploaded logo (image URL / data URL), its zone and the size slider (0.5–1) */
  logo?: { src: string; zoneId: string; scale: number } | null;
};

export type MannequinRender = {
  config: MannequinTemplateConfig;
  layers: MannequinLayers;
  folder: string;
  mirrored: boolean;
  zones: MannequinZone[];
  /** Compositing time (core only), ms */
  ms: number;
  /** Composite + putImageData (+ debug overlay), ms */
  totalMs: number;
};

// Uploaded logos as straight RGBA, cached by source
const logoPixels = new Map<string, Promise<{ rgba: Uint8ClampedArray; w: number; h: number }>>();
function loadLogo(src: string) {
  let p = logoPixels.get(src);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.src = src;
      await img.decode();
      // Longest side ≤ 1600 px: plenty for a zone a few hundred px wide
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round((img.naturalWidth || 1) * k)), h = Math.max(1, Math.round((img.naturalHeight || 1) * k));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      return { rgba: ctx.getImageData(0, 0, w, h).data, w, h };
    })();
    logoPixels.set(src, p);
    if (logoPixels.size > 8) logoPixels.delete(logoPixels.keys().next().value!);
  }
  return p;
}

/** Everything a render needs for this design, loaded (and cached) */
export async function prepareMannequin(design: MannequinDesign) {
  const family = await loadMannequinFamily();
  const { folder, mirrored } = resolveView(family, design.options);
  const layers = await loadMannequinLayers(folder, mirrored);
  if (!isMannequinTemplate(layers.config)) throw new Error(`${folder} is not a mannequin template`);
  // The pocket shading variant is decoded only when the pocket is on
  if (design.options.pocket && layers.config.variants?.pocket) await ensureShading(layers, folder, mirrored, layers.config.variants.pocket.base);
  const zones = zonesFor(family, layers.config, mirrored);
  const logo = design.logo ? await loadLogo(design.logo.src) : null;
  return { family, folder, mirrored, layers, zones, logo };
}

/** Composite a prepared design onto `canvas` (sized to the template). Synchronous: cheap to call on every change. */
export function paintMannequin(
  canvas: HTMLCanvasElement,
  prepared: Awaited<ReturnType<typeof prepareMannequin>>,
  design: MannequinDesign,
  opts: { debug?: boolean; hash?: boolean } = {}
): MannequinRender & { hash?: string } {
  const { layers, zones, folder, mirrored } = prepared;
  const config = layers.config;
  const zone = design.logo ? zones.find((z) => z.id === design.logo!.zoneId) : undefined;
  const logo =
    design.logo && prepared.logo && zone && !zoneDisabled(zone.id, design.options)
      ? { ...prepared.logo, zone, scale: design.logo.scale }
      : null;
  const t0 = performance.now();
  const rgba = composite(assembleComposite(config, layers, { options: design.options, colours: design.colours, trim1: design.trim1, trim2: design.trim2, logo }));
  const ms = performance.now() - t0;
  if (canvas.width !== config.width) canvas.width = config.width;
  if (canvas.height !== config.height) canvas.height = config.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer as ArrayBuffer), config.width, config.height), 0, 0);
  if (opts.debug) drawDebug(ctx, config, layers, zones, design, folder, mirrored);
  const totalMs = performance.now() - t0;
  // Hash of the core's own output (before the canvas' premultiplied storage), for determinism checks
  return { config, layers, folder, mirrored, zones, ms, totalMs, hash: opts.hash ? hashRgba(rgba) : undefined };
}

const DEBUG_COLOURS: Record<string, string> = {
  body: "#e6194b",
  yoke: "#911eb4",
  pocket: "#f58231",
  sleeve: "#3cb44b",
  cuff: "#4363d8",
  collar: "#46f0f0",
  placket: "#f032e6",
  buttons: "#bcf60c",
  trim1: "#ffe119",
  trim2: "#000075",
};

/** ?debug=masks: every region and trim tinted, zone boxes (disabled / avoid areas marked), file names */
function drawDebug(
  ctx: CanvasRenderingContext2D,
  config: MannequinTemplateConfig,
  layers: MannequinLayers,
  zones: MannequinZone[],
  design: MannequinDesign,
  folder: string,
  mirrored: boolean
) {
  const { width: W, height: H } = config;
  const o = design.options;
  const tint = (mask: Uint8Array, hex: string, strength: number) => {
    const n = parseInt(hex.slice(1), 16), R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
    const img = new ImageData(W, H);
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      img.data[i * 4] = R;
      img.data[i * 4 + 1] = G;
      img.data[i * 4 + 2] = B;
      img.data[i * 4 + 3] = mask[i] * strength;
    }
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    c.getContext("2d")!.putImageData(img, 0, 0);
    ctx.drawImage(c, 0, 0);
  };
  const shown = config.regions.filter((r) => r.when?.pocket === undefined || r.when.pocket === o.pocket);
  for (const r of shown) tint(layers.masks[r.mask], DEBUG_COLOURS[r.id] ?? "#888888", r.id === "body" ? 0.18 : 0.45);
  const trims: [string, string][] =
    o.trimStyle === "single" ? [[config.trims.single, "trim1"]] : o.trimStyle === "double" ? [[config.trims.doubleA, "trim1"], [config.trims.doubleB, "trim2"]] : [];
  for (const [f, key] of trims) tint(layers.masks[f], DEBUG_COLOURS[key], 0.7);

  const fs = Math.round(W / 60);
  ctx.save();
  for (const z of zones) {
    const disabled = zoneDisabled(z.id, o);
    ctx.save();
    ctx.translate(z.x + z.w / 2, z.y + z.h / 2);
    ctx.rotate((z.rotation * Math.PI) / 180);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeRect(-z.w / 2, -z.h / 2, z.w, z.h);
    ctx.setLineDash([8, 5]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = disabled ? "#d00000" : "#ff00aa";
    ctx.strokeRect(-z.w / 2, -z.h / 2, z.w, z.h);
    if (disabled) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(-z.w / 2, -z.h / 2);
      ctx.lineTo(z.w / 2, z.h / 2);
      ctx.moveTo(z.w / 2, -z.h / 2);
      ctx.lineTo(-z.w / 2, z.h / 2);
      ctx.stroke();
    }
    ctx.font = `600 ${fs}px sans-serif`;
    ctx.textAlign = "center";
    // Short code (LC, CC, …) keeps neighbouring labels apart; the legend spells them out
    const label = `${PLACEMENTS.find((p) => p.id === z.id)?.code ?? z.id}${disabled ? " ✕" : ""}`;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText(label, 0, -z.h / 2 - fs * 0.5);
    ctx.fillStyle = disabled ? "#d00000" : "#b0007a";
    ctx.fillText(label, 0, -z.h / 2 - fs * 0.5);
    ctx.restore();
  }
  // Active folder + variant files, and the colour key
  const shading = o.pocket && config.variants?.pocket ? config.variants.pocket.base : config.layers.base;
  const lines = [
    `${folder}${mirrored ? " (mirrored → side-right)" : ""}`,
    `shading: ${shading}${config.details.length ? ` · details: ${config.details.map((d) => d.file).join(", ")}` : ""}`,
    `trims: ${o.trimStyle}${trims.length ? " (" + trims.map((t) => t[0]).join(", ") + ")" : ""}`,
    ...shown.map((r) => `■ ${r.id} — ${r.mask}`),
    ...trims.map(([f, k]) => `■ ${k} — ${f}`),
    ...zones.map((z) => {
      const p = PLACEMENTS.find((q) => q.id === z.id);
      return `${p?.code ?? z.id} = ${p?.label ?? z.id}${zoneDisabled(z.id, o) ? " (✕ disabled: pocket)" : ""} · avoid ${z.avoid.join(", ") || "—"}`;
    }),
  ];
  ctx.font = `600 ${fs}px sans-serif`;
  ctx.textAlign = "left";
  lines.forEach((line, i) => {
    const y = fs * 1.6 + i * fs * 1.35;
    const key = line.startsWith("■") ? line.split(" ")[1] : null;
    ctx.fillStyle = key ? (DEBUG_COLOURS[key] ?? "#888") : "#111";
    ctx.fillText(key ? "■" : "", fs, y);
    ctx.fillStyle = "#111";
    ctx.fillText(key ? line.slice(2) : line, fs * (key ? 2.2 : 1), y);
  });
  ctx.restore();
}

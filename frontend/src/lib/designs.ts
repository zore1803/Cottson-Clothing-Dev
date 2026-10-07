import "server-only";
import { COLORS, getProduct } from "@/lib/catalog";
import { clean } from "@/lib/security";
import { isOwnAssetUrl } from "@/lib/cloudinary";

const MAX_BODY_CHARS = 8_000_000;
const MAX_PREVIEW_CHARS = 600_000;
const MAX_ELEMENTS = 20;
const ELEMENT_TYPES = new Set(["logo", "image", "text"]);
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp|svg\+xml);base64,/;

export type DesignInput = {
  product: string;
  color: string;
  width?: number;
  height?: number;
  elements: Record<string, unknown>[];
  preview?: string;
};

/** Validates a studio design payload; returns the cleaned design or an error message */
export function parseDesign(body: Record<string, unknown>): { ok: true; design: DesignInput } | { ok: false; error: string } {
  const product = clean(body.product, 80);
  const color = clean(body.color, 40);
  if (!getProduct(product)) return { ok: false, error: "Unknown product" };
  if (!COLORS.some((c) => c.id === color)) return { ok: false, error: "Unknown colour" };
  if (!Array.isArray(body.elements) || body.elements.length === 0) return { ok: false, error: "A design needs at least one element" };
  if (body.elements.length > MAX_ELEMENTS) return { ok: false, error: `A design can have at most ${MAX_ELEMENTS} elements` };

  const elements: Record<string, unknown>[] = [];
  for (const el of body.elements) {
    if (!el || typeof el !== "object" || Array.isArray(el)) return { ok: false, error: "Invalid design element" };
    const e = el as Record<string, unknown>;
    if (typeof e.type !== "string" || !ELEMENT_TYPES.has(e.type)) return { ok: false, error: "Invalid design element type" };
    if (e.src !== undefined && (typeof e.src !== "string" || !(IMAGE_DATA_URL.test(e.src) || isOwnAssetUrl(e.src)))) return { ok: false, error: "Logos must be PNG, JPG, WebP or SVG images" };
    if (typeof e.text === "string") e.text = e.text.slice(0, 200);
    elements.push(e);
  }

  let preview: string | undefined;
  if (body.preview !== undefined) {
    if (typeof body.preview !== "string" || !(/^data:image\/(jpeg|png|webp);base64,/.test(body.preview) || isOwnAssetUrl(body.preview)) || body.preview.length > MAX_PREVIEW_CHARS)
      return { ok: false, error: "Invalid preview image" };
    preview = body.preview;
  }
  if (JSON.stringify(elements).length + (preview?.length ?? 0) > MAX_BODY_CHARS) return { ok: false, error: "Design too large" };

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 20000 ? v : undefined);
  return { ok: true, design: { product, color, width: num(body.width), height: num(body.height), elements, preview } };
}

/** Short human summary of a design for order line items and the admin list */
export function summarizeDesign(d: { elements: unknown[] }) {
  return (d.elements as Record<string, unknown>[])
    .map((e) => {
      if (e.type === "text") return `text "${String(e.text ?? "").slice(0, 30)}"`;
      const bits = [e.finishing, e.position, e.side].filter((x) => typeof x === "string") as string[];
      return `${e.type === "logo" ? "logo" : "image"}${bits.length ? ` (${bits.join(", ")})` : ""}`;
    })
    .join("; ");
}

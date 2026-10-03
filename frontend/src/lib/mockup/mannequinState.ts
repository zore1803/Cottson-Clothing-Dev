// State and rules of the mannequin customiser (/mockup-lab, later /studio). Pure functions with
// type-only imports, so the Node tests run them directly.
import type { MannequinColours } from "./core/assemble";
import type { Closure, MannequinRegionId, MannequinView, TrimStyle } from "./mannequin";

export type Style = "mannequin" | "ghost";
export type Finish = "embroidery" | "print";

export type PlacementId = "left-chest" | "center-chest" | "right-chest" | "left-sleeve" | "right-sleeve" | "back-neck" | "back-full";

/** Mannequin placements in menu order; `code` is the short label on the debug overlay */
export const PLACEMENTS: { id: PlacementId; label: string; code: string }[] = [
  { id: "left-chest", label: "Left chest", code: "LC" },
  { id: "center-chest", label: "Center chest", code: "CC" },
  { id: "right-chest", label: "Right chest", code: "RC" },
  { id: "left-sleeve", label: "Left sleeve", code: "LS" },
  { id: "right-sleeve", label: "Right sleeve", code: "RS" },
  { id: "back-neck", label: "Back neck", code: "BN" },
  { id: "back-full", label: "Full back", code: "BF" },
];
export const PLACEMENT_IDS = PLACEMENTS.map((p) => p.id);

export const VIEWS: { id: MannequinView; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "side-left", label: "Left" },
  { id: "side-right", label: "Right" },
];

/** Everything the customiser shows, except the logo image itself */
export type MannequinUiState = {
  style: Style;
  view: MannequinView;
  closure: Closure;
  pocket: boolean;
  trimStyle: TrimStyle;
  /** Only the colours the customer picked (hex); the rest follow Body / their defaults */
  colours: MannequinColours;
  trim1: string;
  trim2: string;
  zone: PlacementId;
  /** Logo size, 0.5–1 of the zone */
  scale: number;
  finish: Finish;
};

/** The view a placement lives on */
export function viewForPlacement(id: PlacementId): MannequinView {
  if (id === "left-sleeve") return "side-left";
  if (id === "right-sleeve") return "side-right";
  if (id === "back-neck" || id === "back-full") return "back";
  return "front";
}

/** Starting logo size for a placement: sleeves a little inside their area, others full */
export const defaultScaleFor = (id: PlacementId) => (id === "left-sleeve" || id === "right-sleeve" ? 0.7 : 1);

export const POCKET_NOTICE = "The pocket is on the left chest. Choose right chest or center chest.";

/**
 * The pocket sits on the left chest: with the pocket on, left chest is unavailable. If it was
 * selected, move the logo to right chest and flag a notice for the UI.
 */
export function applyPlacementRules(s: MannequinUiState): { state: MannequinUiState; notice: boolean } {
  if (s.pocket && s.zone === "left-chest") return { state: { ...s, zone: "right-chest" }, notice: true };
  return { state: s, notice: false };
}

/** Picking a placement switches to the view it lives on and resets the size for that placement */
export function choosePlacement(s: MannequinUiState, zone: PlacementId) {
  return applyPlacementRules({ ...s, zone, view: viewForPlacement(zone), scale: defaultScaleFor(zone) });
}

/** "Multi colour" caption: a double line whose two stripes differ */
export const isMultiColour = (s: Pick<MannequinUiState, "trimStyle" | "trim1" | "trim2">) =>
  s.trimStyle === "double" && s.trim1.toLowerCase() !== s.trim2.toLowerCase();

/** Closure and pocket only show on the front view */
export const frontOnlyOptionsEnabled = (view: MannequinView) => view === "front";

// ---- Colour sections -----------------------------------------------------------------------------

/** Which part a part follows until the customer picks its own colour (matches the templates' `inherit`) */
export const INHERIT: Partial<Record<MannequinRegionId, MannequinRegionId>> = {
  yoke: "body",
  pocket: "body",
  sleeve: "body",
  cuff: "sleeve",
  collar: "body",
  placket: "body",
};
const WHITE = "#f5f5f2";
/** Parts with their own default (don't follow Body) */
export const FIXED_DEFAULT: Partial<Record<MannequinRegionId, string>> = { buttons: WHITE };

export type SectionKey = MannequinRegionId | "trim1" | "trim2";
export type Section = { key: SectionKey; label: string; trim: boolean };

/** The colour sections for the current view and options, in display order (absent ones hidden) */
export function sectionsFor(o: Pick<MannequinUiState, "view" | "closure" | "pocket" | "trimStyle">): Section[] {
  const r = (key: MannequinRegionId, label: string): Section => ({ key, label, trim: false });
  const out: Section[] = [r("body", "Body"), r("sleeve", "Sleeves"), r("cuff", "Sleeve cuffs"), r("collar", "Collar")];
  if (o.view === "front") {
    out.push(r("placket", o.closure === "zip" ? "Zip tape" : "Placket"));
    if (o.closure === "buttons") out.push(r("buttons", "Buttons"));
    if (o.pocket) out.push(r("pocket", "Pocket"));
  }
  if (o.view === "back") out.push(r("yoke", "Back yoke"));
  if (o.trimStyle === "single") out.push({ key: "trim1", label: "Stripe colour", trim: true });
  if (o.trimStyle === "double") out.push({ key: "trim1", label: "Outer stripe", trim: true }, { key: "trim2", label: "Inner stripe", trim: true });
  return out;
}

/** The colour a part shows: picked, else what it follows, else its default, else the body colour */
export function colourOf(key: MannequinRegionId, picked: MannequinColours, bodyDefault: string): { hex: string; auto: boolean } {
  if (picked[key]) return { hex: picked[key]!, auto: false };
  if (key === "body") return { hex: bodyDefault, auto: false };
  if (FIXED_DEFAULT[key]) return { hex: FIXED_DEFAULT[key]!, auto: false };
  const parent = INHERIT[key] ?? "body";
  return { hex: colourOf(parent, picked, bodyDefault).hex, auto: true };
}

// ---- Defaults ------------------------------------------------------------------------------------

/**
 * A new session for a product: Mannequin style, front view, the product's body colour, and its
 * collar tipping colour as the stripe (else white; trim2 = trim1 until the customer picks).
 */
export function defaultUiState(p: { bodyHex?: string; tippingHex?: string; tipped?: boolean }): MannequinUiState {
  const trim1 = p.tippingHex ?? WHITE;
  return {
    style: "mannequin",
    view: "front",
    closure: "buttons",
    pocket: false,
    trimStyle: p.tipped ? "single" : "none",
    colours: p.bodyHex ? { body: p.bodyHex } : {},
    trim1,
    trim2: trim1,
    zone: "left-chest",
    scale: defaultScaleFor("left-chest"),
    finish: "embroidery",
  };
}

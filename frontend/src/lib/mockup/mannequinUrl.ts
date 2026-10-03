// The mannequin customiser's state in the URL (everything except the logo image), so a reload
// restores the design. Every value is checked against the allowed ones; anything missing or
// invalid falls back to the defaults passed in.
//
//   style=mannequin|ghost  view=front|back|side-left|side-right  closure=buttons|zip  pocket=1
//   trim=none|single|double  trim1=<hex>  trim2=<hex>  zone=<placement>  size=<50–100>
//   finish=embroidery|print   body / yoke / pocketColour / sleeve / cuff / collar / placket /
//   buttons = <hex without #>
import type { MannequinRegionId } from "./mannequin";
import { PLACEMENT_IDS, type MannequinUiState, type PlacementId } from "./mannequinState.ts";

export type Params = Record<string, string | string[] | undefined>;

const one = (p: Params, k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T =>
  v !== undefined && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const hex = (v: string | undefined) => (v && /^#?[0-9a-fA-F]{6}$/.test(v) ? `#${v.replace("#", "").toLowerCase()}` : undefined);
const bare = (h: string) => h.replace("#", "").toLowerCase();

const COLOUR_PARAMS: [string, MannequinRegionId][] = [
  ["body", "body"],
  ["yoke", "yoke"],
  ["pocketColour", "pocket"],
  ["sleeve", "sleeve"],
  ["cuff", "cuff"],
  ["collar", "collar"],
  ["placket", "placket"],
  ["buttons", "buttons"],
];

/** URL → state. `d` supplies every default (see defaultUiState) */
export function uiStateFromParams(p: Params, d: MannequinUiState): MannequinUiState {
  const colours: MannequinUiState["colours"] = {};
  let anyColour = false;
  for (const [param, id] of COLOUR_PARAMS) {
    const c = hex(one(p, param));
    if (c) {
      colours[id] = c;
      anyColour = true;
    }
  }
  const trim1 = hex(one(p, "trim1")) ?? d.trim1;
  const size = Number(one(p, "size"));
  return {
    style: pick(one(p, "style"), ["mannequin", "ghost"], d.style),
    view: pick(one(p, "view"), ["front", "back", "side-left", "side-right"], d.view),
    closure: pick(one(p, "closure"), ["buttons", "zip"], d.closure),
    pocket: one(p, "pocket") === undefined ? d.pocket : one(p, "pocket") === "1",
    trimStyle: pick(one(p, "trim"), ["none", "single", "double"], d.trimStyle),
    colours: anyColour ? colours : d.colours,
    trim1,
    trim2: hex(one(p, "trim2")) ?? (one(p, "trim1") ? trim1 : d.trim2),
    zone: pick<PlacementId>(one(p, "zone"), PLACEMENT_IDS, d.zone),
    scale: Number.isFinite(size) && size >= 50 && size <= 100 ? Math.round(size) / 100 : d.scale,
    finish: pick(one(p, "finish"), ["embroidery", "print"], d.finish),
  };
}

/** State → URL parameters (every field, so the round trip is exact) */
export function uiStateToParams(s: MannequinUiState): Record<string, string> {
  const out: Record<string, string> = {
    style: s.style,
    view: s.view,
    closure: s.closure,
    pocket: s.pocket ? "1" : "0",
    trim: s.trimStyle,
    trim1: bare(s.trim1),
    trim2: bare(s.trim2),
    zone: s.zone,
    size: String(Math.round(s.scale * 100)),
    finish: s.finish,
  };
  for (const [param, id] of COLOUR_PARAMS) if (s.colours[id]) out[param] = bare(s.colours[id]!);
  return out;
}

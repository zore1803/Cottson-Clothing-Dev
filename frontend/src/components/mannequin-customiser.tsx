"use client";

// Mannequin customiser controls (polo family): style, view, closure, pocket, trim style, colours,
// and the logo panel. State lives in the parent (MannequinUiState, see mannequinState.ts) so the
// same controls can drive /mockup-lab now and /studio later.
import { useId, useRef } from "react";
import { Check, ChevronDown, Upload, X } from "lucide-react";
import { GARMENT_COLORS, TRIM_COLORS, type Color } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import {
  PLACEMENTS,
  POCKET_NOTICE,
  VIEWS,
  applyPlacementRules,
  choosePlacement,
  colourOf,
  frontOnlyOptionsEnabled,
  isMultiColour,
  sectionsFor,
  viewForPlacement,
  type MannequinUiState,
  type PlacementId,
  type SectionKey,
  type Style,
} from "@/lib/mockup/mannequinState";
import type { MannequinZone } from "@/lib/mockup/mannequin";

const colourName = (hex: string) =>
  [...GARMENT_COLORS, ...TRIM_COLORS].find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase();
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160;
};
export const viewLabel = (v: string) => VIEWS.find((x) => x.id === v)?.label.toLowerCase() ?? v;

/** A row of mutually exclusive options (radio group); 44 px tall for touch */
function Segmented<T extends string | boolean>({
  label,
  options,
  value,
  onChange,
  disabled,
  dotOn,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Option that gets a small dot (e.g. the view the logo is on) */
  dotOn?: T;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-disabled={disabled} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1 text-sm">
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={cn(
            "relative min-h-11 rounded-md px-2 font-medium transition-colors",
            value === v ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground"
          )}
        >
          {text}
          {dotOn === v && (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-accent" aria-hidden />
          )}
          {dotOn === v && <span className="sr-only"> (logo is on this view)</span>}
        </button>
      ))}
    </div>
  );
}

/** One colour section: a row with its current colour; opens a palette below it */
function ColourSection({
  label,
  colors,
  value,
  auto,
  open,
  onToggle,
  onChange,
}: {
  label: string;
  colors: Color[];
  value: string;
  auto: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (hex: string) => void;
}) {
  const panel = useId();
  return (
    <div className={cn("border-b last:border-b-0", open && "bg-muted/40")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panel}
        className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
      >
        <span className="size-5 shrink-0 rounded-full ring-1 ring-black/15" style={{ background: value }} />
        <span className="flex-1 font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {colourName(value)}
          {auto && " · auto"}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panel} role="radiogroup" aria-label={`${label} colour`} className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 px-3 pb-3 pt-1">
          {colors.map((c) => {
            const selected = !auto && value.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${label}: ${c.name}`}
                title={c.name}
                onClick={() => onChange(c.hex)}
                className="grid size-11 place-items-center justify-self-center rounded-full"
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full ring-1 ring-black/15 transition-transform hover:scale-110",
                    selected && "ring-2 ring-brand ring-offset-2"
                  )}
                  style={{ background: c.hex }}
                >
                  {selected && <Check className={cn("size-3.5", isLight(c.hex) ? "text-black" : "text-white")} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Style toggle, shown only for products whose family has a mannequin */
export function StyleToggle({ value, onChange }: { value: Style; onChange: (s: Style) => void }) {
  return (
    <Segmented
      label="Mockup style"
      options={[["mannequin", "Mannequin"], ["ghost", "Without mannequin"]] as const}
      value={value}
      onChange={onChange}
    />
  );
}

/** View, closure, pocket, trim style and the colour sections */
export function MannequinControls({
  state,
  onChange,
  bodyDefault,
  openSection,
  onOpenSection,
  onNotice,
  logoPresent,
}: {
  state: MannequinUiState;
  onChange: (s: MannequinUiState) => void;
  /** The product's body colour (what Body shows before the customer picks) */
  bodyDefault: string;
  openSection: SectionKey | null;
  onOpenSection: (k: SectionKey | null) => void;
  /** The pocket rule moved the logo (show the notice) */
  onNotice: () => void;
  logoPresent: boolean;
}) {
  const s = state;
  const frontOnly = frontOnlyOptionsEnabled(s.view);
  const set = (patch: Partial<MannequinUiState>) => {
    const r = applyPlacementRules({ ...s, ...patch });
    if (r.notice) onNotice();
    onChange(r.state);
  };
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 text-sm font-semibold text-brand">View</div>
        <Segmented
          label="View"
          options={VIEWS.map((v) => [v.id, v.label] as const)}
          value={s.view}
          onChange={(view) => set({ view })}
          dotOn={logoPresent ? viewForPlacement(s.zone) : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1.5 text-sm font-semibold text-brand">Closure</div>
          <Segmented
            label="Closure"
            options={[["buttons", "Buttons"], ["zip", "Half zip"]] as const}
            value={s.closure}
            onChange={(closure) => set({ closure })}
            disabled={!frontOnly}
          />
        </div>
        <div>
          <div className="mb-1.5 text-sm font-semibold text-brand">Pocket</div>
          <Segmented
            label="Pocket"
            options={[[false, "No"], [true, "Yes"]] as const}
            value={s.pocket}
            onChange={(pocket) => set({ pocket })}
            disabled={!frontOnly}
          />
        </div>
        {!frontOnly && <p className="col-span-2 -mt-1 text-xs text-muted-foreground">Shown on the front view</p>}
      </div>

      <div>
        <div className="mb-1.5 text-sm font-semibold text-brand">Trim style</div>
        <Segmented
          label="Trim style"
          options={[["none", "None"], ["single", "Single line"], ["double", "Double line"]] as const}
          value={s.trimStyle}
          onChange={(trimStyle) => set({ trimStyle })}
        />
        {isMultiColour(s) && <p className="mt-1 text-xs font-medium text-brand">Multi colour</p>}
      </div>

      <div>
        <div className="mb-1.5 text-sm font-semibold text-brand">Colours</div>
        <div className="overflow-hidden rounded-lg border bg-white">
          {sectionsFor(s).map((sec) => {
            if (sec.trim) {
              const key = sec.key as "trim1" | "trim2";
              return (
                <ColourSection
                  key={sec.key}
                  label={sec.label}
                  colors={TRIM_COLORS}
                  value={s[key]}
                  auto={false}
                  open={openSection === sec.key}
                  onToggle={() => onOpenSection(openSection === sec.key ? null : sec.key)}
                  onChange={(hex) => set({ [key]: hex })}
                />
              );
            }
            const region = sec.key as Exclude<SectionKey, "trim1" | "trim2">;
            const c = colourOf(region, s.colours, bodyDefault);
            return (
              <ColourSection
                key={sec.key}
                label={sec.label}
                colors={GARMENT_COLORS}
                value={c.hex}
                auto={c.auto}
                open={openSection === sec.key}
                onToggle={() => onOpenSection(openSection === sec.key ? null : sec.key)}
                onChange={(hex) => set({ colours: { ...s.colours, [region]: hex } })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Rasterise an SVG upload to PNG (longest side ≤ 1600 px); other images pass through */
export async function readLogo(file: File): Promise<{ src: string; w: number; h: number }> {
  const src = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = new Image();
  img.src = src;
  await img.decode();
  const w0 = img.naturalWidth || 1600, h0 = img.naturalHeight || 1600;
  if (file.type !== "image/svg+xml" && !file.name.toLowerCase().endsWith(".svg")) return { src, w: w0, h: h0 };
  const k = 1600 / Math.max(w0, h0);
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return { src: c.toDataURL("image/png"), w, h };
}

/** Logo upload, finish, placement (with the pocket rule) and size with its cm readout */
export function MannequinLogoPanel({
  state,
  onChange,
  logo,
  onLogo,
  notice,
  onNotice,
  zones,
  pxPerCm,
}: {
  state: MannequinUiState;
  onChange: (s: MannequinUiState) => void;
  logo: { src: string; name: string; w: number; h: number } | null;
  onLogo: (l: { src: string; name: string; w: number; h: number } | null) => void;
  notice: boolean;
  onNotice: (show: boolean) => void;
  /** Zones seen so far, by id (each view's template lists its own) */
  zones: Partial<Record<PlacementId, MannequinZone>>;
  pxPerCm: number;
}) {
  const s = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const zone = zones[s.zone];
  // Fitted logo size in cm (contain fit, scaled by the slider) and the zone's print limit
  const size = (() => {
    if (!zone || !logo) return null;
    const k = Math.min(zone.w / logo.w, zone.h / logo.h) * s.scale;
    return { w: (logo.w * k) / pxPerCm, h: (logo.h * k) / pxPerCm, max: zone.maxCm };
  })();
  return (
    <section className="w-full space-y-5 rounded-xl border bg-white p-4 text-sm shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-brand">Your logo</h2>
          <div role="radiogroup" aria-label="Finish" className="grid grid-cols-2 rounded-lg border bg-muted/50 p-0.5">
            {(["embroidery", "print"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={s.finish === f}
                onClick={() => onChange({ ...s, finish: f })}
                className={cn("min-h-9 rounded-md px-3 text-xs font-medium capitalize", s.finish === f ? "bg-white text-brand shadow-sm" : "text-muted-foreground")}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const l = await readLogo(f);
            onLogo({ ...l, name: f.name });
          }}
        />
        {logo ? (
          <div className="flex items-center gap-3 rounded-lg border bg-white p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
            <img src={logo.src} alt="" className="size-10 rounded bg-muted object-contain p-1" />
            <span className="min-w-0 flex-1 truncate font-medium">{logo.name}</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 px-1 text-xs font-medium text-brand hover:underline">
              Replace
            </button>
            <button type="button" onClick={() => onLogo(null)} aria-label="Remove logo" className="grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed bg-white px-4 py-5 text-center hover:border-brand hover:bg-muted/40"
          >
            <Upload className="size-5 text-brand" />
            <span className="font-medium text-brand">Upload your logo</span>
            <span className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG</span>
          </button>
        )}
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placement</div>
        <label className="relative block">
          <span className="sr-only">Logo placement</span>
          <select
            value={s.zone}
            onChange={(e) => {
              const r = choosePlacement(s, e.target.value as PlacementId);
              onNotice(r.notice);
              onChange(r.state);
            }}
            className="h-11 w-full cursor-pointer appearance-none rounded-lg border bg-white pl-3 pr-9 font-medium outline-none hover:border-brand/40 focus:ring-2 focus:ring-brand/30"
          >
            {PLACEMENTS.map((p) => {
              const off = s.pocket && p.id === "left-chest";
              return (
                <option key={p.id} value={p.id} disabled={off} title={off ? POCKET_NOTICE : undefined}>
                  {p.label}
                  {off ? " (pocket)" : ""}
                </option>
              );
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </label>
        {s.pocket && <p className="mt-1.5 text-xs text-muted-foreground">{POCKET_NOTICE}</p>}
        {notice && (
          <div role="status" className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="flex-1">The pocket covers the left chest, so your logo moved to the right chest.</span>
            <button type="button" onClick={() => onNotice(false)} aria-label="Dismiss" className="-m-1 grid size-8 place-items-center rounded hover:bg-amber-100">
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-2 flex justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">Size</span>
          <span className="font-medium text-foreground">{Math.round(s.scale * 100)}%</span>
        </span>
        <input
          type="range"
          min={50}
          max={100}
          value={s.scale * 100}
          onChange={(e) => onChange({ ...s, scale: +e.target.value / 100 })}
          aria-label="Logo size"
          className="h-11 w-full accent-[var(--color-brand)]"
        />
        <span className="flex justify-between text-[11px] text-muted-foreground">
          <span>Smaller</span>
          <span>Fills the area</span>
        </span>
        {size && (
          <span className="mt-1.5 block text-xs text-foreground">
            {size.w.toFixed(1)} × {size.h.toFixed(1)} cm <span className="text-muted-foreground">(max {size.max.w} × {size.max.h} cm)</span>
          </span>
        )}
      </label>
    </section>
  );
}

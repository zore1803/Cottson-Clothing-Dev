"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Upload, X } from "lucide-react";
import {
  PRODUCTS,
  GARMENT_COLORS,
  TRIM_COLORS,
  assetUrl,
  type Color,
} from "@/lib/catalog";
import { MockupPreview } from "@/components/mockup-preview";
import { MannequinPreview } from "@/components/mannequin-preview";
import { MannequinControls, MannequinLogoPanel, StyleToggle, viewLabel } from "@/components/mannequin-customiser";
import { uiStateToParams } from "@/lib/mockup/mannequinUrl";
import { viewForPlacement, type MannequinUiState, type PlacementId, type SectionKey } from "@/lib/mockup/mannequinState";
import type { MannequinZone } from "@/lib/mockup/mannequin";
import {
  resolveColours,
  type PreparedTemplate,
} from "@/lib/mockup/renderCanvas";
import { defaultColours, hasMannequin, mannequinDefaultsFor } from "@/lib/mockup/products";
import { DEFAULT_LOGO_SCALE, defaultScaleFor, hasOrientation } from "@/lib/mockup/zones";
import type {
  Finish,
  LogoOrientation,
  LogoZoneId,
  RegionColours,
  RegionId,
} from "@/lib/mockup/types";
import { cn } from "@/lib/utils";

const TRIM_REGIONS: RegionId[] = ["collar-tip", "sleeve-tip", "neck-tip"];

const colourName = (hex: string) =>
  [...GARMENT_COLORS, ...TRIM_COLORS].find(
    (c) => c.hex.toLowerCase() === hex.toLowerCase(),
  )?.name ?? hex.toUpperCase();

/** One garment part: a row with its current colour; opens a compact palette below it */
function PartPicker({
  label,
  colors,
  value,
  inherited,
  open,
  onToggle,
  onChange,
}: {
  label: string;
  colors: Color[];
  value: string;
  /** True when the part just follows another part's colour (e.g. sleeves = body) */
  inherited: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (hex: string) => void;
}) {
  return (
    <div className={cn("border-b last:border-b-0", open && "bg-muted/40")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
      >
        <span
          className="size-5 shrink-0 rounded-full ring-1 ring-black/15"
          style={{ background: value }}
        />
        <span className="flex-1 font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {colourName(value)}
          {inherited && " · auto"}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="grid grid-cols-7 gap-2 px-3 pb-3 pt-1">
          {colors.map((c) => {
            const selected = value.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={selected}
                onClick={() => onChange(c.hex)}
                className={cn(
                  "grid aspect-square place-items-center rounded-full ring-1 ring-black/15 transition-transform hover:scale-110",
                  selected && "ring-2 ring-brand ring-offset-2",
                )}
                style={{ background: c.hex }}
              >
                {selected && (
                  <Check
                    className={cn(
                      "size-3.5",
                      isLight(c.hex) ? "text-black" : "text-white",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160;
};

/** Product dropdown with a search box: type to filter by name or category */
function ProductPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = PRODUCTS.find((p) => p.slug === value);
  const q = query.trim().toLowerCase();
  const results = q
    ? PRODUCTS.filter((p) =>
        `${p.title} ${p.category}`.toLowerCase().includes(q),
      )
    : PRODUCTS;

  // Close on a click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) =>
      !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (slug: string) => {
    onChange(slug);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-sm text-sm">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setActive(0);
        }}
        className="flex h-11 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left shadow-sm hover:border-brand/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {current?.title ?? "Choose a product"}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {current?.category}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(results.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter" && results[active])
                  pick(results[active].slug);
                else if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-10 w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.map((p, i) => (
              <li key={p.slug} role="option" aria-selected={p.slug === value}>
                <button
                  type="button"
                  onClick={() => pick(p.slug)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left",
                    i === active && "bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.category}
                  </span>
                  {p.slug === value && (
                    <Check className="size-4 shrink-0 text-brand" />
                  )}
                </button>
              </li>
            ))}
            {!results.length && (
              <li className="px-3 py-6 text-center text-muted-foreground">
                No products match “{query}”
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MockupLab({
  initialSlug,
  initialUi,
  debugMasks = false,
  perf = false,
}: {
  initialSlug?: string;
  /** Mannequin customiser state restored from the URL (style "ghost" shows the ghost template as before) */
  initialUi: MannequinUiState;
  /** ?debug=masks (the ghost preview reads it itself) */
  debugMasks?: boolean;
  /** ?perf=1: show the last composite + paint time */
  perf?: boolean;
}) {
  const [slug, setSlug] = useState(initialSlug ?? "indus-01");
  // Mannequin customiser (polo family); the ghost state below is untouched by it
  const [ui, setUi] = useState<MannequinUiState>(initialUi);
  const mannequinOn = hasMannequin(slug) && ui.style === "mannequin";
  const [notice, setNotice] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey | null>("body");
  const [logoDims, setLogoDims] = useState<{ src: string; w: number; h: number } | null>(null);
  const [zonesSeen, setZonesSeen] = useState<Partial<Record<PlacementId, MannequinZone>>>({});
  const [pxPerCm, setPxPerCm] = useState(11.6);
  const [timing, setTiming] = useState<{ ms: number; totalMs: number } | null>(null);
  const [colours, setColours] = useState<RegionColours>({});
  const [template, setTemplate] = useState<PreparedTemplate | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [zone, setZone] = useState<LogoZoneId>("left-chest");
  const [scale, setScale] = useState(DEFAULT_LOGO_SCALE);
  const [orientation, setOrientation] = useState<LogoOrientation>("along");
  const [finish, setFinish] = useState<Finish>("embroidery");
  const [openPart, setOpenPart] = useState<RegionId | null>("body");

  const merged = { ...defaultColours(slug), ...colours };
  const logo = useMemo(
    () => (logoSrc ? { src: logoSrc, zone, scale, finish, orientation } : null),
    [logoSrc, zone, scale, finish, orientation],
  );

  // Mannequin state → URL (debounced replaceState), so a reload restores all but the logo image
  useEffect(() => {
    const t = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const keep = ["debug", "perf"].flatMap((k) => (url.searchParams.has(k) ? [[k, url.searchParams.get(k)!] as const] : []));
      const next = new URLSearchParams({ product: slug, ...uiStateToParams(ui) });
      for (const [k, v] of keep) next.set(k, v);
      window.history.replaceState(window.history.state, "", `${url.pathname}?${next}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [ui, slug]);

  // The logo's pixel size (for the cm readout); measured whenever the logo changes
  useEffect(() => {
    if (!logoSrc) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setLogoDims({ src: logoSrc, w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.src = logoSrc;
    return () => {
      cancelled = true;
    };
  }, [logoSrc]);
  const mannequinLogo = logoSrc && logoDims?.src === logoSrc ? { src: logoSrc, name: logoName, w: logoDims.w, h: logoDims.h } : null;

  const design = useMemo(
    () => ({
      options: { view: ui.view, closure: ui.closure, pocket: ui.pocket, trimStyle: ui.trimStyle },
      colours: ui.colours,
      trim1: ui.trim1,
      trim2: ui.trim2,
      logo: logoSrc ? { src: logoSrc, zoneId: ui.zone, scale: ui.scale } : null,
    }),
    [ui, logoSrc],
  );
  // Remember every zone a loaded view has shown (the logo panel's cm readout needs its box)
  const onMannequinTemplate = useCallback(({ config, zones }: { config: { pxPerCm: number }; zones: MannequinZone[] }) => {
    setPxPerCm(config.pxPerCm);
    setZonesSeen((seen) => ({ ...seen, ...Object.fromEntries(zones.map((z) => [z.id, z])) }));
  }, []);
  const onRendered = useCallback((r: { ms: number; totalMs: number }) => perf && setTiming({ ms: r.ms, totalMs: r.totalMs }), [perf]);
  const logoElsewhere = !!logoSrc && viewForPlacement(ui.zone) !== ui.view;

  return (
    <div className="grid w-full gap-8 px-4 pt-28 pb-8 sm:pt-32 md:grid-cols-[340px_minmax(0,1fr)_340px] md:px-[4vw]">
      {/* Right column: product picker + logo (equal width to the left column, so the garment is page-centred) */}
      <div className={cn("flex flex-col items-end gap-5 md:order-3 md:sticky md:top-32 md:self-start", mannequinOn && "order-2")}>
        <div className="w-full max-w-sm">
          <div className="mb-1.5 text-sm font-semibold text-brand">Product</div>
          <ProductPicker
            value={slug}
            onChange={(s) => {
              setSlug(s);
              setColours({});
              // New product: its own defaults, keeping the chosen style where the product has it
              setUi({ ...mannequinDefaultsFor(s), style: hasMannequin(s) ? ui.style : "ghost" });
              setNotice(false);
            }}
          />
        </div>
        {mannequinOn && (
          <div className="w-full max-w-sm">
            <MannequinLogoPanel
              state={ui}
              onChange={setUi}
              logo={mannequinLogo}
              onLogo={(l) => {
                setLogoSrc(l?.src ?? null);
                setLogoName(l?.name ?? "");
              }}
              notice={notice}
              onNotice={setNotice}
              zones={zonesSeen}
              pxPerCm={pxPerCm}
            />
          </div>
        )}
        {!mannequinOn && template && (
          <section className="w-full max-w-sm space-y-5 rounded-xl border bg-white p-4 text-sm shadow-sm [&>*]:p-0">
            {/* Title and the logo file share one section */}
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-brand">Your logo</h2>
                {/* Finish: compact toggle in the title row */}
                <div role="group" aria-label="Finish" className="grid grid-cols-2 rounded-lg border bg-muted/50 p-0.5">
                  {(["embroidery", "print"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFinish(f)}
                      aria-pressed={finish === f}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium capitalize",
                        finish === f ? "bg-white text-brand shadow-sm" : "text-muted-foreground",
                      )}
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
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    setLogoSrc(r.result as string);
                    setLogoName(f.name);
                  };
                  r.readAsDataURL(f);
                }}
              />
              {logoSrc ? (
                <div className="flex items-center gap-3 rounded-lg border bg-white p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                  <img
                    src={logoSrc}
                    alt=""
                    className="size-10 rounded bg-muted object-contain p-1"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {logoName}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoSrc(null)}
                    aria-label="Remove logo"
                    className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                  >
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
                  <span className="font-medium text-brand">
                    Upload your logo
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG, JPG or SVG
                  </span>
                </button>
              )}
            </div>
            <div className="p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Placement
              </div>
              <label className="relative block">
                <span className="sr-only">Logo placement</span>
                <select
                  value={zone}
                  onChange={(e) => {
                    const id = e.target.value as LogoZoneId;
                    setZone(id);
                    setScale(defaultScaleFor(id));
                    setOrientation("along");
                  }}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border bg-white pl-3 pr-9 font-medium outline-none hover:border-brand/40 focus:ring-2 focus:ring-brand/30"
                >
                  {template.config.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </label>
              {hasOrientation(zone) && (
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orientation</div>
                  <div role="radiogroup" aria-label="Logo orientation" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
                    {([["along", "Along sleeve"], ["upright", "Upright"]] as const).map(([value, text]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={orientation === value}
                        onClick={() => setOrientation(value)}
                        className={cn(
                          "rounded-md py-1.5 font-medium",
                          orientation === value ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <label className="block p-4">
              <span className="mb-2 flex justify-between text-xs">
                <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                  Size
                </span>
                <span className="font-medium text-foreground">
                  {Math.round(scale * 100)}%
                </span>
              </span>
              <input
                type="range"
                min={50}
                max={100}
                value={scale * 100}
                onChange={(e) => setScale(+e.target.value / 100)}
                className="w-full accent-[var(--color-brand)]"
              />
              <span className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Smaller</span>
                <span>Fills the area</span>
              </span>
            </label>
          </section>
        )}
      </div>

      <div className={cn("flex justify-center md:order-2 md:sticky md:top-32 md:self-start", mannequinOn && "order-1 flex-col items-center gap-2")}>
        {mannequinOn ? (
          <>
            <MannequinPreview
              design={design}
              debug={debugMasks}
              perf={perf}
              onTemplate={onMannequinTemplate}
              onRendered={onRendered}
              alt={`Polo on a mannequin, ${viewLabel(ui.view)} view`}
              className="w-full max-w-[560px] md:h-[calc(100vh-12rem)] md:w-auto md:max-w-full"
            />
            {logoElsewhere && (
              <p role="status" className="text-sm text-muted-foreground">
                Logo is on the {viewLabel(viewForPlacement(ui.zone))} view
              </p>
            )}
            {perf && timing && (
              <p className="rounded bg-black/80 px-2 py-1 font-mono text-xs text-white" data-perf>
                composite {timing.ms.toFixed(1)} ms · composite + paint {timing.totalMs.toFixed(1)} ms
              </p>
            )}
          </>
        ) : (
        <MockupPreview
          key={slug}
          productSlug={slug}
          colours={colours}
          logo={logo}
          fallbackSrc={assetUrl(slug, "photo.jpg")}
          onTemplate={setTemplate}
          // Whole garment fits the screen height (below the pinned header), centred in its column
          className="w-full max-w-[560px] md:h-[calc(100vh-10rem)] md:w-auto md:max-w-full"
        />
        )}
      </div>

      <div className={cn("space-y-5 text-sm md:order-1", mannequinOn && "order-3")}>
        <h1 className="text-xl font-bold text-brand">Mockup</h1>
        {hasMannequin(slug) && (
          <StyleToggle
            value={ui.style}
            onChange={(style) => {
              setUi({ ...ui, style });
              setNotice(false);
            }}
          />
        )}
        {mannequinOn && (
          <MannequinControls
            state={ui}
            onChange={setUi}
            bodyDefault={defaultColours(slug).body ?? "#f5f5f2"}
            openSection={openSection}
            onOpenSection={setOpenSection}
            onNotice={() => setNotice(true)}
            logoPresent={!!logoSrc}
          />
        )}
        {!mannequinOn && !template && (
          <p className="text-muted-foreground">
            No template for this garment type yet — showing photo.jpg.
          </p>
        )}

        {!mannequinOn && template && (
          <div>
            <div className="mb-1.5 text-sm font-semibold text-brand">
              Colours
            </div>
            <div className="overflow-hidden rounded-lg border bg-white">
              {(() => {
                const resolved = resolveColours(template, merged);
                return template.regions.map((r) => (
                  <PartPicker
                    key={r.id}
                    label={r.label}
                    colors={
                      TRIM_REGIONS.includes(r.id) ? TRIM_COLORS : GARMENT_COLORS
                    }
                    value={resolved[r.id]}
                    inherited={!merged[r.id]}
                    open={openPart === r.id}
                    onToggle={() =>
                      setOpenPart((o) => (o === r.id ? null : r.id))
                    }
                    onChange={(hex) =>
                      setColours((c) => ({ ...c, [r.id]: hex }))
                    }
                  />
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

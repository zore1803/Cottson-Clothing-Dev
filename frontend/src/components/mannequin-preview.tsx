"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderEmbroidery } from "@/lib/embroidery";
import { stitchTexture } from "@/components/mockup-preview";
import { loadImage } from "@/lib/mockup/renderCanvas";
import { paintMannequin, prepareMannequin, type MannequinDesign } from "@/lib/mockup/renderMannequin";
import { prefetchMannequinViews, type MannequinTemplateConfig, type MannequinZone } from "@/lib/mockup/mannequin";

type Prepared = Awaited<ReturnType<typeof prepareMannequin>>;

/**
 * Live full-mannequin mockup (polo family). Loads the view's layers (cached), then re-composites
 * synchronously on every change with the shared core. The box keeps the template's aspect ratio
 * (1200 × 1600), so switching views never makes the layout jump.
 */
export function MannequinPreview({
  design,
  showPlacement = false,
  placementZone,
  debug = false,
  perf = false,
  className,
  alt,
  onRendered,
  onTemplate,
}: {
  design: MannequinDesign;
  showPlacement?: boolean;
  placementZone?: string;
  debug?: boolean;
  /** ?perf=1: also hash each render (data-rgba-hash) for determinism checks */
  perf?: boolean;
  className?: string;
  alt?: string;
  /** Called after each paint: core composite time and composite + paint time (ms) */
  onRendered?: (info: { ms: number; totalMs: number; folder: string; mirrored: boolean }) => void;
  /** Called when a view has loaded, with its template and zones (mirrored for side-right) */
  onTemplate?: (info: { config: MannequinTemplateConfig; zones: MannequinZone[] }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prepared, setPrepared] = useState<{ key: string; p: Prepared } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onRenderedRef = useRef(onRendered);
  const onTemplateRef = useRef(onTemplate);
  useEffect(() => {
    onRenderedRef.current = onRendered;
    onTemplateRef.current = onTemplate;
  }, [onRendered, onTemplate]);

  // What needs (re)loading: the view folder and the logo image; colours don't
  const { view, closure } = design.options;
  const logoSrc = design.logo?.src ?? null;
  const pocket = design.options.pocket;
  const loadKey = `${view}|${closure}|${pocket}|${logoSrc ?? ""}|${design.logo?.finish}|${design.logo?.zoneId}|${design.logo?.scale}`;
  useEffect(() => {
    let cancelled = false;
    prepareMannequin({ ...design, options: { ...design.options, view, closure, pocket } })
      .then(async (p) => {
        if (logoSrc && design.logo?.finish === "embroidery") {
          const zone = p.zones.find((z) => z.id === design.logo?.zoneId);
          if (zone) {
            const img = await loadImage(logoSrc);
            const k = Math.min(zone.w / img.naturalWidth, zone.h / img.naturalHeight) * design.logo.scale;
            const widthCm = Math.max(0.5, img.naturalWidth * k / p.layers.config.pxPerCm);
            const threads = await renderEmbroidery(logoSrc, { maxColors: 4, widthCm, width: 900, keepBackground: true });
            const src = await stitchTexture(logoSrc, threads);
            p = await prepareMannequin({ ...design, logo: { ...design.logo, src } });
          }
        }
        if (cancelled) return;
        setPrepared({ key: loadKey, p });
        onTemplateRef.current?.({ config: p.layers.config, zones: p.zones });
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
    // design is read for the logo only; loadKey covers everything that needs reloading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);

  const ready = prepared?.key === loadKey ? prepared.p : null;
  // Once a view is up, warm the other views in idle time (skipped on data saver)
  const family = ready?.family;
  useEffect(() => (family ? prefetchMannequinViews(family, closure) : undefined), [family, closure]);
  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    const r = paintMannequin(canvasRef.current, ready, design, { debug, hash: perf });
    if (r.hash) canvasRef.current.dataset.rgbaHash = r.hash;
    onRenderedRef.current?.({ ms: r.ms, totalMs: r.totalMs, folder: r.folder, mirrored: r.mirrored });
    canvasRef.current.dataset.renderMs = r.ms.toFixed(1);
    canvasRef.current.dataset.paintMs = r.totalMs.toFixed(1);
    canvasRef.current.dataset.renderCount = String(Number(canvasRef.current.dataset.renderCount ?? 0) + 1);
  }, [ready, design, debug, perf]);

  // Box aspect from the template (1200 × 1600 until the first view loads)
  const size = prepared?.p.layers.config;
  const guide = showPlacement ? ready?.zones.find((z) => z.id === (placementZone ?? design.logo?.zoneId)) : null;
  return (
    <div className={cn("relative", className)} style={{ aspectRatio: `${size?.width ?? 1200} / ${size?.height ?? 1600}` }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt ?? "Polo on a mannequin"}
        data-mannequin=""
        // Keeps showing the previous view while the next one loads (no flash on view changes)
        className={cn("block size-full transition-opacity duration-200", prepared ? "opacity-100" : "opacity-0")}
      />
      {guide && size && !(design.options.pocket && guide.id === "left-chest") && <div aria-label={`${guide.label} logo placement area`} className="pointer-events-none absolute border-2 border-dashed border-sky-500 bg-sky-400/10 ring-1 ring-white/80" style={{ left: `${guide.x / size.width * 100}%`, top: `${guide.y / size.height * 100}%`, width: `${guide.w / size.width * 100}%`, height: `${guide.h / size.height * 100}%`, transform: `rotate(${guide.rotation ?? 0}deg)` }} />}
      {!prepared && !error && (
        <div className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading mockup" />
        </div>
      )}
      {error && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}

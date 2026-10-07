"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadImage, loadTemplate, renderMockup, type PreparedTemplate } from "@/lib/mockup/renderCanvas";
import { defaultColours, templateTypeFor } from "@/lib/mockup/products";
import { logoSizeCm, placedZone } from "@/lib/mockup/zones";
import { renderEmbroidery } from "@/lib/embroidery";
import type { LogoPlacement, LogoZoneId, LogoOrientation, RegionColours } from "@/lib/mockup/types";

type Props = {
  productSlug: string;
  /** Region colours (hex) on top of the product's defaults */
  colours?: RegionColours;
  logo?: LogoPlacement | null;
  placementGuide?: { zone: LogoZoneId; orientation: LogoOrientation } | null;
  /** Shown when the product has no template (or it fails to load) */
  fallbackSrc?: string;
  alt?: string;
  className?: string;
  /** Called with the loaded template (or null when falling back), e.g. to list supported regions */
  onTemplate?: (t: PreparedTemplate | null) => void;
};

/**
 * The uploaded logo in its OWN colours with the stitch render's light/shade laid over it, so
 * embroidery reads as thread without changing any colour of the artwork.
 */
export async function stitchTexture(originalSrc: string, stitchesSrc: string) {
  const [orig, stitches] = await Promise.all([loadImage(originalSrc), loadImage(stitchesSrc)]);
  const W = 900;
  const H = Math.max(1, Math.round((W * orig.naturalHeight) / (orig.naturalWidth || W)));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(orig, 0, 0, W, H);
  // Grayscale stitches, soft-lit onto the artwork: lighter thread crowns, darker gaps
  const g = document.createElement("canvas");
  g.width = W;
  g.height = H;
  const gx = g.getContext("2d", { willReadFrequently: true })!;
  gx.fillStyle = "#808080";
  gx.fillRect(0, 0, W, H);
  gx.filter = "grayscale(1) contrast(2.4)";
  gx.drawImage(stitches, 0, 0, W, H);
  gx.filter = "none";
  // Re-centre the stitch pattern on mid-grey (128): overlay then only adds light/shade around
  // the thread and leaves the logo's average colour exactly as uploaded
  const id = gx.getImageData(0, 0, W, H);
  const px = id.data;
  let sum = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) {
    sum += px[i];
    n++;
  }
  const shift = n ? 128 - sum / n : 0;
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.max(0, Math.min(255, px[i] + shift));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  gx.putImageData(id, 0, 0);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.85;
  ctx.drawImage(g, 0, 0);
  // Keep exactly the uploaded logo's shape
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(orig, 0, 0, W, H);
  return c.toDataURL("image/png");
}

/**
 * Live ghost-mannequin mockup for a product. Renders on a canvas at the template's native size and
 * scales with CSS, so it's responsive. Falls back to the product photo when the garment type
 * has no template in public/mockups/.
 */
export function MockupPreview({ productSlug, colours, logo, placementGuide, fallbackSrc, alt, className, onTemplate }: Props) {
  const type = templateTypeFor(productSlug);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<{ type: string; t: PreparedTemplate | null } | null>(null);
  const [logoImg, setLogoImg] = useState<{ src: string; img: HTMLImageElement | null } | null>(null);
  const onTemplateRef = useRef(onTemplate);
  useEffect(() => {
    onTemplateRef.current = onTemplate;
  }, [onTemplate]);

  // Load the template for this garment type (cached across instances)
  useEffect(() => {
    let cancelled = false;
    (type ? loadTemplate(type) : Promise.resolve(null)).then((t) => {
      if (cancelled) return;
      setLoaded({ type: type ?? "", t });
      onTemplateRef.current?.(t);
    });
    return () => {
      cancelled = true;
    };
  }, [type]);

  // ?debug=masks overlays every mask in a translucent colour (read after mount: no SSR mismatch)
  const [debugMasks, setDebugMasks] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL
    setDebugMasks(new URLSearchParams(window.location.search).get("debug") === "masks");
  }, []);

  const template = loaded?.type === (type ?? "") ? loaded.t : undefined;

  // Embroidery: stitch the logo with the real thread renderer (same as the product page),
  // sized to its real width in the zone so the stitch density is right
  const rawSrc = logo?.src ?? null;
  const [rawImage, setRawImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!rawSrc) return;
    let cancelled = false;
    loadImage(rawSrc).then((img) => !cancelled && setRawImage({ src: rawSrc, img })).catch(() => {});
    return () => { cancelled = true; };
  }, [rawSrc]);
  const stitchKey = (() => {
    if (!rawSrc || logo?.finish !== "embroidery" || !template || rawImage?.src !== rawSrc) return null;
    const zone = placedZone(template.config, logo.zone, logo.orientation);
    if (!zone) return null;
    // Use the actual aspect ratio so tall and wide artwork get the right stitch density.
    const cm = Math.max(0.5, Math.round(logoSizeCm(template.config, zone, rawImage.img.naturalWidth, rawImage.img.naturalHeight, logo.scale).w * 10) / 10);
    return `${rawSrc}:${cm}`;
  })();
  const [stitched, setStitched] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!stitchKey || !rawSrc) return;
    let cancelled = false;
    const cm = Number(stitchKey.split(":").pop());
    renderEmbroidery(rawSrc, { maxColors: 4, widthCm: cm, width: 900, keepBackground: true })
      .then((stitches) => stitchTexture(rawSrc, stitches))
      .then((url) => !cancelled && setStitched({ key: stitchKey, url }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [stitchKey, rawSrc]);
  // Until the stitches are ready, show the plain logo
  const logoSrc = stitchKey && stitched?.key === stitchKey ? stitched.url : rawSrc;

  // Load the logo image whenever its (plain or stitched) source changes
  useEffect(() => {
    if (!logoSrc) return;
    let cancelled = false;
    loadImage(logoSrc)
      .then((img) => !cancelled && setLogoImg({ src: logoSrc, img }))
      .catch(() => !cancelled && setLogoImg({ src: logoSrc, img: null }));
    return () => {
      cancelled = true;
    };
  }, [logoSrc]);

  const img = logoSrc && logoImg?.src === logoSrc ? logoImg.img : null;

  // Re-render synchronously on any change: tinted regions are cached, so this is cheap
  useEffect(() => {
    if (!template || !canvasRef.current) return;
    renderMockup(template, { colours: { ...defaultColours(productSlug), ...colours }, logo }, img, canvasRef.current, {
      debugMasks,
      // Transparent: the page shows through; the ground shadow is still drawn
      background: "transparent",
    });
  }, [template, productSlug, colours, logo, img, debugMasks]);

  const loading = template === undefined;
  const aspect = template ? template.config.width / template.config.height : 2 / 3;
  const guide = template && placementGuide ? placedZone(template.config, placementGuide.zone, placementGuide.orientation) : null;

  if (template === null) {
    // No template for this garment type: the product photo, as before
    return fallbackSrc ? (
      <div className={cn("relative", className)} style={{ aspectRatio: aspect }}>
        <Image src={fallbackSrc} alt={alt ?? ""} fill sizes="(min-width: 1024px) 600px, 100vw" className="object-contain" />
      </div>
    ) : null;
  }

  return (
    <div className={cn("relative", className)} style={{ aspectRatio: aspect }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt ?? "Garment mockup"}
        className={cn("block size-full transition-opacity duration-300", loading ? "opacity-0" : "opacity-100")}
      />
      {guide && template && (
        <div aria-label={`${guide.label} logo placement area`} className="pointer-events-none absolute border-2 border-dashed border-sky-500 bg-sky-400/10 ring-1 ring-white/80"
          style={{ left: `${guide.x / template.config.width * 100}%`, top: `${guide.y / template.config.height * 100}%`, width: `${guide.w / template.config.width * 100}%`, height: `${guide.h / template.config.height * 100}%`, transform: `rotate(${guide.rotation ?? 0}deg)` }} />
      )}
      {debugMasks && (
        // Debug tints hide the chosen colours; make that obvious and easy to leave
        <a
          href="?"
          className="absolute right-2 top-2 rounded-md bg-amber-400 px-2.5 py-1 text-xs font-semibold text-black shadow hover:bg-amber-300"
        >
          Mask outlines on · Exit
        </a>
      )}
      {loading && (
        <div className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading mockup" />
        </div>
      )}
    </div>
  );
}

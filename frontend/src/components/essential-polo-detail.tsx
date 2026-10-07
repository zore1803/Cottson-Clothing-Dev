"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { toast } from "sonner";
import { ChevronRight, Clock, ImagePlus, Minus, Move, Package, Palette, Plus, Ruler, Shirt, X, ZoomIn, ZoomOut } from "lucide-react";
import { type Product, assetUrl, colorById, formatPrice, variantUrl } from "@/lib/catalog";
import { BULK_TIERS, garmentUnitPrice } from "@/lib/pricing";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOGO_CM,
  FINISHINGS,
  finishingById,
  focusOn,
  frameFor,
  largestWidthFor,
  maxWidthFor,
  placeAt,
  tierFor,
  type Focus,
  type Placement,
  type PositionId,
} from "@/components/design-studio/placement";
import { LogoLayer, blendFor } from "@/components/design-studio/logo-layer";
import { PositionDialog } from "@/components/design-studio/position-dialog";
import { GarmentPhoto, useFabricColor, imageForColor } from "@/components/design-studio/garment-photo";
import { useFabricUnder, usePhoto } from "@/components/design-studio/use-conformed-art";
import { stitchAngleFor } from "@/lib/conform";
import { readLogoFile, useLogoArt, useStitchability, type LogoFile } from "@/components/design-studio/use-logo-artwork";
import { THREADS } from "@/lib/embroidery";
import { contrastRatio } from "@/lib/contrast";

type ThreadChoice = "auto" | "logo" | (typeof THREADS)[number]["id"];

/** Two-way pill toggle over the photo */
function Segmented<T>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [string, T])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-background/90 p-0.5 text-xs font-medium shadow-sm" role="group" aria-label={label}>
      {options.map(([text, v]) => (
        <button
          key={text}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn("rounded-full px-3 py-1", value === v ? "bg-brand text-white" : "hover:bg-muted")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const SIZE_GUIDE = [
  ["S", "52", "69"],
  ["M", "55", "71"],
  ["L", "58", "73"],
  ["XL", "61", "75"],
  ["XXL", "64", "77"],
];

function SizeGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0b243a]/40 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-label="Size guide" className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[22px] font-bold tracking-[-0.02em] text-[#113858]">Size guide</h3>
          <button type="button" aria-label="Close size guide" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-[#F3F6F8] text-[#113858] hover:bg-[#E9F0F5]">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-[13px] text-[#607487]">Approximate garment measurements in cm, laid flat. Between sizes? Choose the larger one.</p>
        <table className="mt-5 w-full text-left text-[14px]">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#607487]">
              <th className="pb-2">Size</th>
              <th className="pb-2">Chest (width)</th>
              <th className="pb-2">Length</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_GUIDE.map(([size, chest, length]) => (
              <tr key={size} className="border-t border-[#113858]/10 text-[#113858]">
                <td className="py-2.5 font-bold">{size}</td>
                <td className="py-2.5">{chest}</td>
                <td className="py-2.5">{length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Numbered step card used for each configuration section */
function Step({ n, title, hint, children }: { n: number; title: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] bg-[#F5F8FA] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#113858] text-[13px] font-bold text-white">{n}</span>
        <h2 className="text-[16px] font-bold text-[#113858]">{title}</h2>
        {hint && <span className="ml-auto text-[12px] font-medium text-[#607487]">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Product detail page for the Essential Polo: wave-sweep trim-color swap, a quick logo
 * preview, and the real catalog (price, sizes, minBulk) + cart. The full editor is /studio. */
export function EssentialPoloDetail({ product, initialColor }: { product: Product; initialColor: string }) {
  const add = useCart((s) => s.add);
  const [colorId, setColorId] = useState(initialColor);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  // Alternate photographed angle (0 = the main photo, which supports the color swap)
  const [pose, setPose] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);

  // Real-world size of this product's photo frame, so logos are sized in true cm
  const frame = useMemo(() => frameFor(product.fit), [product.fit]);
  const [logo, setLogo] = useState<LogoFile | null>(null);
  const [placement, setPlacement] = useState<Placement>(() => placeAt(frame, "left-chest", DEFAULT_LOGO_CM, 1));
  const [positionId, setPositionId] = useState<PositionId>("left-chest");
  // Print / Stitched pick the smallest tier of that kind; growing the logo steps the tier up
  const [finishingId, setFinishingId] = useState("dtf-s");
  const [positionOpen, setPositionOpen] = useState(false);
  // Zoomed in on the logo (set on upload / by the zoom button); null = whole garment
  const [focus, setFocus] = useState<Focus | null>(null);
  // Before/after compare in embroidery mode: true shows the uploaded file un-stitched
  const [showFlat, setShowFlat] = useState(false);
  // Flat / Conformed compare: false shows the stitched logo without bending it to the fabric
  const [conformed, setConformed] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const finishing = finishingById(finishingId);
  const embroidered = finishing.kind === "embroidery";
  const maxW = logo ? largestWidthFor(finishing.kind, logo.aspect) : 10;

  // The shirt's actual color right under the logo (sampled from the photo), for thread contrast
  const fabricSrc = variantUrl(product, colorId);
  const fabric = useFabricColor(
    fabricSrc,
    Math.round(((placement.x + placement.w / 2) / frame.w) * 50) / 50,
    Math.round(((placement.y + placement.w / (logo?.aspect ?? 1) / 2) / frame.h) * 50) / 50
  );

  // Thread: "auto" keeps the logo's own colors while they stand out from the shirt (3:1+) and
  // otherwise switches to the stock thread with the best contrast; the customer can override.
  const [threadChoice, setThreadChoice] = useState<ThreadChoice>("auto");
  const logoColors = logo ? logo.palette.slice(0, finishing.maxColors) : [];
  const bestThread = THREADS.reduce((a, b) => (contrastRatio(b.hex, fabric) > contrastRatio(a.hex, fabric) ? b : a));
  const logoReadable = logoColors.length > 0 && contrastRatio(logoColors[0], fabric) >= 3;
  const thread =
    threadChoice === "logo"
      ? null
      : threadChoice === "auto"
        ? logoReadable
          ? null
          : bestThread
        : THREADS.find((t) => t.id === threadChoice)!;
  const threadColors = thread ? [thread.hex] : logoColors;
  // Contrast of the main thread color (the one most of the logo is stitched in) against the shirt
  const threadContrast = threadColors.length ? contrastRatio(threadColors[0], fabric) : 21;
  // The photo at full resolution, and the fabric right under the logo (folds, stripes)
  const photo = usePhoto(fabricSrc);
  const under = useFabricUnder(photo, frame, placement, logo?.aspect ?? 1);
  // Multiply shows the fabric through the thread at full strength: fine for plain fabric, but on
  // stripes / checks the pattern would print straight through the logo, so keep thread opaque
  const blend = under && !under.plain ? "normal" : blendFor(fabric, threadColors);
  // Stitch along clear folds (else the usual 45°)
  const stitchAngle = under ? stitchAngleFor(under.stats) : 45;

  // Too-fine strokes: optionally grown before stitching so the thinnest reach ~1.6 mm
  const stitchCheck = useStitchability(logo?.src ?? null, embroidered, placement.w);
  const [thicken, setThicken] = useState(false);
  const thickenMm = thicken ? Math.min(1, Math.max(0.2, (1.6 - stitchCheck.minStrokeMm) / 2)) : 0;

  const logoArt = useLogoArt(logo?.src ?? null, {
    embroidered,
    maxColors: finishing.maxColors,
    color: embroidered ? (thread?.hex ?? null) : null,
    widthCm: placement.w,
    thickenMm,
    angleDeg: stitchAngle,
  }).url;

  const onLogoFile = async (file: File) => {
    try {
      const l = await readLogoFile(file);
      // Standard left-chest size: the longer side ~8 cm, within the finishing's limit
      const w = Math.min(DEFAULT_LOGO_CM, DEFAULT_LOGO_CM * l.aspect, maxWidthFor(finishing, l.aspect));
      const p = placeAt(frame, positionId, w, l.aspect);
      setLogo(l);
      setPlacement(p);
      setThicken(false);
      // Zoom the photo in on the logo right away
      setFocus(focusOn(frame, p, l.aspect));
    } catch {
      toast.error("Couldn't read that file — try a PNG, JPG or SVG");
    }
  };

  const onPlacement = (p: Placement) => {
    setPlacement(p);
    if (logo) setFinishingId(tierFor(finishing, p.w, logo.aspect).id);
  };

  const setFinish = (kind: "print" | "embroidery") => {
    if (!logo) return setFinishingId(FINISHINGS.find((f) => f.kind === kind)!.id);
    // Smallest tier of that kind that fits the current size, else shrink to the largest one
    const fits = FINISHINGS.find((f) => f.kind === kind && placement.w <= maxWidthFor(f, logo.aspect) + 1e-6);
    const tier = fits ?? FINISHINGS.filter((f) => f.kind === kind).at(-1)!;
    setFinishingId(tier.id);
    const w = Math.min(placement.w, maxWidthFor(tier, logo.aspect));
    setPlacement((p) => ({ ...p, w, x: p.x + (p.w - w) / 2, y: p.y + (p.w - w) / logo.aspect / 2 }));
  };

  const color = colorById(colorId);
  const totalQty = Object.values(sizes).reduce((n, q) => n + q, 0);
  // Bulk tiers apply per size line, exactly as the cart prices them
  const orderTotal = Object.values(sizes).reduce((n, q) => n + q * garmentUnitPrice(product.price, q), 0);
  const saved = totalQty * product.price - orderTotal;
  const setSize = (s: string, qty: number) => setSizes((prev) => ({ ...prev, [s]: Math.max(0, qty) }));

  const selectColor = (id: string) => {
    if (id === colorId) return;
    setColorId(id);
    setPose(0);
    window.history.replaceState(null, "", `?color=${id}`);
  };

  const addToCart = () => {
    if (totalQty < product.minBulk) {
      toast.error(`Minimum order is ${product.minBulk} pieces (you have ${totalQty})`);
      return;
    }
    for (const [size, qty] of Object.entries(sizes)) {
      if (qty > 0) add({ slug: product.slug, title: product.title, colorId, colorName: color.name, size, qty, basePrice: product.price, imageUrl: imageForColor(product, colorId) });
    }
    toast.success(`Added ${totalQty} × ${product.title} (${color.name}) to cart`);
    setSizes({});
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-28 sm:pt-32">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-[#607487]">
        <Link href="/products" className="hover:text-[#113858] hover:underline">Products</Link>
        <ChevronRight className="size-3.5" />
        <span>{product.category}</span>
        <ChevronRight className="size-3.5" />
        <span className="text-[#113858]">{product.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: photo with the wave-sweep color swap, zoomed in on the logo once there is one.
            Sticky so it stays on screen while the (usually longer) options column scrolls. */}
        <div className="lg:sticky lg:top-28 lg:self-start">
         <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          {product.poses && product.poses > 1 && (
            <div className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:max-h-[calc(100vh-9rem)] lg:w-20 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: product.poses }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPose(i)}
                  aria-label={`View angle ${i + 1}`}
                  aria-pressed={pose === i}
                  className={cn(
                    "relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[#F3F6F8] lg:w-full",
                    pose === i ? "border-[#113858]" : "border-transparent hover:border-[#113858]/30"
                  )}
                >
                  <NextImage src={assetUrl(product.slug, "model-photo.png", i)} alt="" fill unoptimized className="object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="relative order-1 min-w-0 flex-1 lg:order-2">
          <div className="relative grid aspect-[682/1024] w-full place-items-center justify-items-start overflow-hidden rounded-[28px] bg-[#F3F6F8]">
              <GarmentPhoto ref={frameRef} product={product} colorId={colorId} pose={pose} focus={focus}>
                {logo && logoArt && (
                  <LogoLayer
                    src={showFlat ? logo.src : logoArt}
                    embroidered={embroidered && !showFlat}
                    fabricSrc={fabricSrc}
                    blend={blend}
                    frame={frame}
                    placement={placement}
                    aspect={logo.aspect}
                    maxWidth={maxW}
                    onChange={onPlacement}
                    frameRef={frameRef}
                    zoom={focus?.z ?? 1}
                    conformed={conformed}
                  />
                )}
              </GarmentPhoto>
          </div>
          {logo && (
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-end gap-2">
              {embroidered && (
                // Before/after: the uploaded file as-is vs. the stitched render, same spot and zoom
                <Segmented
                  label="Compare before and after"
                  options={[["Before", true], ["After", false]]}
                  value={showFlat}
                  onChange={setShowFlat}
                />
              )}
              {embroidered && !showFlat && (
                // Flat / Conformed: the stitched logo as-is vs. bent to the fabric's folds and pattern
                <Segmented
                  label="Compare flat and conformed"
                  options={[["Flat", false], ["Conformed", true]]}
                  value={conformed}
                  onChange={setConformed}
                />
              )}
              <button
                type="button"
                aria-pressed={!!focus}
                onClick={() => setFocus((f) => (f ? null : focusOn(frame, placement, logo.aspect)))}
                className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-background"
              >
                {focus ? <ZoomOut className="size-3.5" /> : <ZoomIn className="size-3.5" />}
                {focus ? "Zoom out" : "Zoom to logo"}
              </button>
            </div>
          )}
          </div>
         </div>
        </div>

        {/* Right: title, design studio CTA, logo, trim color, sizes, price + add to cart */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#607487] sm:text-[12px]">{product.category}</p>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-[#113858] sm:text-[40px]">{product.title}</h1>
          <p className="mt-3 text-[26px] font-bold text-[#113858]">
            {formatPrice(product.price, product.currency)}
            <span className="ml-1.5 text-[14px] font-medium text-[#607487]">per piece</span>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#607487]">{product.description}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-[13px] font-semibold text-[#113858]">
            <span className="flex items-center gap-1.5 rounded-full bg-[#E9F0F5] px-3.5 py-1.5">
              <Package className="size-4" /> Min. order {product.minBulk} pieces
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-[#E9F0F5] px-3.5 py-1.5">
              <Clock className="size-4" /> Ready in 7–10 business days
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/studio?product=${product.slug}&color=${colorId}`}
              className="flex items-center gap-2 rounded-full bg-[#113858] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0b243a]"
            >
              <Shirt className="size-4" /> Customize
            </Link>
            <Link
              href={`/mockup-lab?product=${product.slug}`}
              className="flex items-center gap-2 rounded-full border border-[#113858]/25 px-5 py-2.5 text-[13px] font-semibold text-[#113858] transition-colors hover:bg-[#F3F6F8]"
            >
              <Palette className="size-4" /> Design Studio
            </Link>
          </div>

          <div className="mt-8 space-y-4">
          <Step n={1} title="Add your logo">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLogoFile(f);
                e.target.value = "";
              }}
            />
            {!logo ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#113858]/30 bg-white px-4 py-6 text-sm font-semibold text-[#113858] transition-colors hover:border-[#113858] hover:bg-[#E9F0F5]"
              >
                <ImagePlus className="size-5" /> Upload your logo <span className="font-normal text-[#607487]">· PNG, JPG or SVG</span>
              </button>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">Drag the logo on the photo to place it.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(["print", "embroidery"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setFinish(a)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize",
                        finishing.kind === a ? "border-brand bg-brand text-white" : "text-muted-foreground hover:border-brand"
                      )}
                    >
                      {a === "embroidery" ? "Stitched (Embroidery)" : "Print"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPositionOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-brand"
                  >
                    <Move className="size-3.5" /> Position graphic
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setFocus(null);
                    }}
                    aria-label="Remove logo"
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {finishing.label} · max {finishing.maxColors} colors and {finishing.maxCm}×{finishing.maxCm} cm
                  {embroidered && !thread && logo.palette.length > finishing.maxColors && ` — your ${logo.palette.length}-color logo was reduced`}
                </p>

                {embroidered && (
                  <div className="mt-4">
                    <div className="text-xs font-medium text-foreground">
                      Thread — {thread ? thread.name : "Logo colors"}
                      {threadChoice === "auto" && <span className="text-muted-foreground"> (auto)</span>}
                    </div>
                    <div role="radiogroup" aria-label="Thread colour" className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={!thread}
                        onClick={() => setThreadChoice("logo")}
                        className={cn(
                          "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
                          !thread ? "border-brand ring-1 ring-brand" : "text-muted-foreground hover:border-brand"
                        )}
                      >
                        <span className="flex -space-x-1" aria-hidden>
                          {logoColors.map((c) => (
                            <span key={c} className="size-3 rounded-full ring-1 ring-black/15" style={{ background: c }} />
                          ))}
                        </span>
                        Logo colors
                      </button>
                      {THREADS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={thread?.id === t.id}
                          aria-label={`${t.name} thread`}
                          title={`${t.name} · ${contrastRatio(t.hex, fabric).toFixed(1)}:1 on this shirt`}
                          onClick={() => setThreadChoice(t.id)}
                          className={cn(
                            "size-7 rounded-full ring-1 ring-inset ring-black/15 transition-transform hover:scale-110",
                            thread?.id === t.id && "ring-2 ring-brand ring-offset-2 ring-offset-background"
                          )}
                          style={{ background: t.hex }}
                        />
                      ))}
                    </div>
                    {threadContrast < 3 && (
                      <p className="mt-2 text-xs text-amber-700">
                        Low contrast ({threadContrast.toFixed(1)}:1) — this thread will be hard to see on this shirt.{" "}
                        {thread?.id !== bestThread.id && (
                          <button type="button" onClick={() => setThreadChoice(bestThread.id)} className="font-semibold underline underline-offset-2">
                            Use {bestThread.name} thread
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {stitchCheck.tooFine && !thicken && (
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    Some strokes/text are too fine to stitch cleanly at this size (thinnest ~{stitchCheck.minStrokeMm.toFixed(1)} mm, needs
                    1.5 mm).{" "}
                    <button type="button" onClick={() => setThicken(true)} className="font-semibold underline underline-offset-2">
                      Thicken strokes
                    </button>
                  </p>
                )}
                {embroidered && thicken && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Strokes thickened by {thickenMm.toFixed(1)} mm per side for stitching.{" "}
                    <button type="button" onClick={() => setThicken(false)} className="font-semibold text-brand underline underline-offset-2">
                      Undo
                    </button>
                  </p>
                )}

                {positionOpen && logoArt && (
                  <PositionDialog
                    frame={frame}
                    logoSrc={logoArt}
                    aspect={logo.aspect}
                    finishing={finishing}
                    placement={placement}
                    positionId={positionId}
                    onClose={() => setPositionOpen(false)}
                    onApply={(p, pos) => {
                      setPlacement(p);
                      setPositionId(pos);
                      setPositionOpen(false);
                      setFocus(focusOn(frame, p, logo.aspect));
                    }}
                  />
                )}
              </>
            )}
          </Step>

          <Step n={2} title={<>Colour <span className="font-medium text-[#607487]">— {color.name}</span></>}>
            <div className="flex flex-wrap items-center gap-3">
              {product.colors.map((id) => {
                const c = colorById(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectColor(id)}
                    aria-label={c.name}
                    title={c.name}
                    className={cn(
                      "size-9 rounded-full ring-1 ring-border transition-shadow",
                      colorId === id && "ring-2 ring-offset-2 ring-brand"
                    )}
                    style={{ background: c.hex }}
                  />
                );
              })}
            </div>
          </Step>

          <Step n={3} title="Choose sizes" hint={`${totalQty} / min. ${product.minBulk}`}>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#113858] underline-offset-2 hover:underline"
            >
              <Ruler className="size-4" /> Size guide
            </button>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {product.sizes.map((s) => (
                <div key={s} className={cn("flex items-center justify-between rounded-xl border bg-white px-3 py-2.5", (sizes[s] ?? 0) > 0 ? "border-[#113858]" : "border-[#113858]/10")}>
                  <span className="text-sm font-semibold">{s}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSize(s, (sizes[s] ?? 0) - 1)}
                      className="grid size-6 place-items-center rounded-md hover:bg-muted"
                      aria-label={`Fewer ${s}`}
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-5 text-center text-sm tabular-nums">{sizes[s] ?? 0}</span>
                    <button
                      type="button"
                      onClick={() => setSize(s, (sizes[s] ?? 0) + 1)}
                      className="grid size-6 place-items-center rounded-md hover:bg-muted"
                      aria-label={`More ${s}`}
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Step>
          </div>

          <div className="mt-4 rounded-[24px] border border-[#113858]/10 bg-white p-5 shadow-[0_10px_30px_rgba(17,56,88,0.06)] sm:p-6">
            {totalQty > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {product.sizes
                  .filter((s) => (sizes[s] ?? 0) > 0)
                  .map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-full bg-[#E9F0F5] px-3.5 py-1.5">
                      <span className="text-sm font-semibold">{s}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{sizes[s]}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[13px] text-[#607487]">
                  {totalQty > 0 ? `${totalQty} pieces` : "Order total"}
                </div>
                <div className="text-[26px] font-bold leading-tight text-[#113858]">
                  {formatPrice(totalQty > 0 ? orderTotal : 0, product.currency)}
                </div>
                {saved > 0 && <div className="text-[12px] font-semibold text-emerald-700">You save {formatPrice(saved, product.currency)} with bulk pricing</div>}
              </div>
              <button
                type="button"
                onClick={addToCart}
                className="h-12 shrink-0 rounded-full bg-[#113858] px-8 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b243a]"
              >
                Add to cart ({totalQty})
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#113858]/10 pt-4 text-[12px] font-semibold text-[#113858]">
              <span className="text-[#607487]">Bulk pricing per size:</span>
              {[...BULK_TIERS].reverse().map((t) => (
                <span key={t.min} className="rounded-full bg-[#E9F0F5] px-2.5 py-0.5">
                  {t.min}+ pcs · {Math.round(t.discount * 100)}% off
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {guideOpen && <SizeGuide onClose={() => setGuideOpen(false)} />}
    </div>
  );
}

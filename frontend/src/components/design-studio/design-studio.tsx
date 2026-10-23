"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CirclePlus,
  Copy,
  FolderOpen,
  Loader2,
  Mail,
  Minus,
  Move,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Smile,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { type Product, PRODUCTS, colorById, variantUrl, formatPrice } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { CUSTOMIZATION_FEE, bulkDiscount, garmentUnitPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  FINISHINGS,
  DEFAULT_LOGO_CM,
  IMAGE_ASPECT,
  frameFor,
  type Frame,
  POSITIONS,
  finishingById,
  finishingHint,
  focusOn,
  largestWidthFor,
  maxWidthFor,
  placeAt,
  tierFor,
  type Focus,
  type Placement,
  type PositionId,
} from "./placement";
import { LogoLayer, blendFor } from "./logo-layer";
import { PositionDialog } from "./position-dialog";
import { FabricCloseup, GarmentPhoto, useFabricColor } from "./garment-photo";
import { readLogoFile, useLogoArt, type LogoFile } from "./use-logo-artwork";

const WHATSAPP_NUMBER = "919892297764";
const STORAGE_KEY = "cottson-studio";

// Default view: enlarged so the chest (where logos go) fills the frame
const CHEST_VIEW: Focus = { px: 0.5, py: 0.36, z: 1.45 };

type FrontPrint = {
  finishingId: string;
  positionId: PositionId;
  logo: LogoFile | null;
  placement: Placement;
  /** One color for the whole logo (monochrome / custom), or null for the logo's own colors */
  thread: string | null;
};
type Saved = { slug: string; colorId: string; sizes: Record<string, number>; print: FrontPrint | null };

const newPrint = (frame: Frame): FrontPrint => ({
  finishingId: "emb-standard",
  positionId: "left-chest",
  logo: null,
  placement: placeAt(frame, "left-chest", DEFAULT_LOGO_CM, 1),
  thread: null,
});

/** Card title with the brand's accent full stop, e.g. "Product." */
const CardTitle = ({ children }: { children: string }) => (
  <h2 className="text-xl font-bold tracking-tight text-brand">
    {children}
    <span className="text-brand-accent">.</span>
  </h2>
);
const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <section className={cn("rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]", className)}>{children}</section>
);
/** One logo color: swatch + hex code */
const Chip = ({ hex }: { hex: string }) => (
  <span className="flex items-center gap-1.5 rounded-md bg-muted py-1 pl-1 pr-2 text-[11px] font-medium uppercase tabular-nums">
    <span className="size-5 rounded border border-black/10" style={{ background: hex }} />
    {hex}
  </span>
);

/** Pill-shaped select like the reference studio's dropdowns */
function PillSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-11 w-full cursor-pointer appearance-none truncate rounded-lg bg-muted pl-3 pr-9 text-sm font-semibold text-brand outline-none focus:ring-2 focus:ring-brand/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-brand" />
    </label>
  );
}

export function DesignStudio({ product, initialColor, products = PRODUCTS }: { product: Product; initialColor: string; products?: Product[] }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  // Real-world size of this product's photo frame, so the logo is sized in true cm
  const frame = useMemo(() => frameFor(product.fit), [product.fit]);

  const [colorId, setColorId] = useState(initialColor);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [print, setPrint] = useState<FrontPrint | null>(() => newPrint(frame));
  const [active, setActive] = useState<"overview" | "front">("front");
  const [sizesOpen, setSizesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  // Zoomed in on the logo (set on upload / by the zoom button); null = chest view
  const [focus, setFocus] = useState<Focus | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore a design saved with "Save design". Runs after hydration because localStorage
  // doesn't exist on the server; reading it during render would mismatch the server HTML.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Saved | null;
      if (saved?.slug !== product.slug) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
      if (product.colors.includes(saved.colorId)) setColorId(saved.colorId);
      setSizes(saved.sizes ?? {});
      // Designs saved before logo palettes existed have none; the chips just stay empty
      if (saved.print?.logo) saved.print.logo.palette ??= [];
      setPrint(saved.print);
      setActive(saved.print ? "front" : "overview");
    } catch {}
  }, [product]);

  const qty = Object.values(sizes).reduce((n, q) => n + q, 0);
  const color = colorById(colorId);
  const finishing = print ? finishingById(print.finishingId) : null;
  const embroidered = finishing?.kind === "embroidery";
  const logo = print?.logo ?? null;
  // Dragging bigger than the tier allows steps up to the next tier (see onPlacement)
  const maxW = finishing && logo ? largestWidthFor(finishing.kind, logo.aspect) : 10;

  const art = useLogoArt(logo?.src ?? null, {
    embroidered: !!embroidered,
    maxColors: finishing?.maxColors ?? 2,
    color: print?.thread ?? null,
    widthCm: print?.placement.w ?? 8,
  });
  const logoArt = art.url;

  const fabric = useFabricColor(
    variantUrl(product, colorId),
    print ? (print.placement.x + print.placement.w / 2) / frame.w : 0.5,
    print && logo ? (print.placement.y + print.placement.w / logo.aspect / 2) / frame.h : 0.4
  );

  const updatePrint = (p: Partial<FrontPrint>) => setPrint((cur) => (cur ? { ...cur, ...p } : cur));

  // Moving / resizing on the photo; a logo grown past its tier moves up to the tier that fits
  const onPlacement = (placement: Placement) => {
    if (!print || !finishing || !logo) return;
    const tier = tierFor(finishing, placement.w, logo.aspect);
    if (tier.id !== finishing.id) toast.message(`Switched to ${tier.label}`, { description: finishingHint(tier) });
    updatePrint({ placement, finishingId: tier.id });
  };

  // "Make logo monochrome": white on dark garments, black on light ones
  const monochrome = () => {
    const [r, g, b] = (fabric.match(/\d+/g) ?? ["0", "0", "0"]).map(Number);
    updatePrint({ thread: 0.299 * r + 0.587 * g + 0.114 * b < 140 ? "#f4f3ee" : "#151515" });
  };

  const onUpload = async (file: File) => {
    if (!print) return;
    try {
      const l = await readLogoFile(file);
      const f = finishingById(print.finishingId);
      // Standard sizes: longer side ~8 cm on the chest, up to 20 cm for a centre-chest print
      const size = print.positionId === "center-chest" ? 20 : DEFAULT_LOGO_CM;
      const w = Math.min(maxWidthFor(f, l.aspect), size, size * l.aspect);
      const placement = placeAt(frame, print.positionId, w, l.aspect);
      updatePrint({ logo: l, placement, thread: null });
      // Zoom the photo in on the logo right away
      setSlide(0);
      setFocus(focusOn(frame, placement, l.aspect));
      if (f.kind === "embroidery" && l.palette.length > f.maxColors)
        toast.message(`Your logo has ${l.palette.length} colors`, {
          description: `${f.label} stitches up to ${f.maxColors} thread colors, so we've reduced it. Choose Premium for up to 4.`,
        });
    } catch {
      toast.error("Couldn't read that file — try a PNG, JPG or SVG");
    }
  };

  const changeFinishing = (id: string) => {
    if (!print) return;
    const f = finishingById(id);
    if (!logo) return updatePrint({ finishingId: id });
    // Shrink to the new max size around the same centre if needed
    const p = print.placement;
    const w = Math.min(p.w, maxWidthFor(f, logo.aspect));
    updatePrint({
      finishingId: id,
      placement: { ...p, w, x: p.x + (p.w - w) / 2, y: p.y + (p.w - w) / logo.aspect / 2 },
    });
  };

  const changePosition = (id: PositionId) => {
    if (!print) return;
    const placement = placeAt(frame, id, print.placement.w, logo?.aspect ?? 1, print.placement.rotation);
    updatePrint({ positionId: id, placement });
    if (logo && focus) setFocus(focusOn(frame, placement, logo.aspect));
  };

  const removePrint = () => {
    setPrint(null);
    setActive("overview");
    setPositionOpen(false);
    setSlide(0);
    setFocus(null);
  };

  const startOver = () => {
    setColorId(product.originalColor);
    setSizes({});
    setPrint(newPrint(frame));
    setActive("front");
    setPositionOpen(false);
    setSlide(0);
    setFocus(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    toast.success("Started over");
  };

  const saveDesign = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug: product.slug, colorId, sizes, print } satisfies Saved));
      toast.success("Design saved on this device");
    } catch {
      toast.error("Couldn't save — the logo file may be too large");
    }
  };

  // Small JPEG of the finished product for the cart and the order record
  const composePreview = async (size = 400) => {
    const load = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const i = new window.Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = src;
      });
    const photo = await load(variantUrl(product, colorId));
    const c = document.createElement("canvas");
    c.width = Math.round(size * (photo.naturalWidth / photo.naturalHeight));
    c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(photo, 0, 0, c.width, c.height);
    if (print && logo && logoArt) {
      const art = await load(logoArt);
      const { x, y, w, rotation } = print.placement;
      // The page shows the photo in a 2:3 frame (object-cover), so map cm onto that centred slice
      const fw = Math.min(c.width, c.height * IMAGE_ASPECT), fh = fw / IMAGE_ASPECT;
      const fx = (c.width - fw) / 2, fy = (c.height - fh) / 2;
      const pw = (w / frame.w) * fw, ph = pw / logo.aspect;
      const px = fx + (x / frame.w) * fw, py = fy + (y / frame.h) * fh;
      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      if (embroidered) {
        // Same contact shadow the on-screen preview adds with CSS (the stitch render has none baked in)
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 1;
        ctx.shadowOffsetY = 1;
      }
      ctx.drawImage(art, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
    }
    return c.toDataURL("image/jpeg", 0.85);
  };

  const checkout = async () => {
    if (qty < product.minBulk) {
      toast.error(`Minimum order is ${product.minBulk} pieces — choose your sizes`);
      setSizesOpen(true);
      return;
    }
    setBusy(true);
    try {
      const preview = await composePreview();
      const customized = !!(print && logo);
      let designId: string | undefined;
      if (customized) {
        const res = await fetch("/api/designs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            product: product.slug,
            color: colorId,
            width: frame.w,
            height: frame.h,
            elements: [
              {
                type: "logo",
                side: "front",
                finishing: print.finishingId,
                position: print.positionId,
                thread: print.thread,
                unit: "cm",
                ...print.placement,
                h: print.placement.w / logo.aspect,
                src: logo.src,
              },
            ],
            preview,
          }),
        });
        if (!res.ok) throw new Error("save");
        designId = (await res.json()).id;
      }
      const label = customized ? ` (custom, front ${finishingById(print.finishingId).kind === "embroidery" ? "embroidery" : "print"})` : "";
      for (const [size, n] of Object.entries(sizes)) {
        if (n <= 0) continue;
        addToCart({
          designId,
          slug: product.slug,
          title: product.title + label,
          colorId,
          colorName: color.name,
          size,
          qty: n,
          basePrice: product.price,
          imageUrl: variantUrl(product, colorId),
          preview,
          design: customized ? { product: product.slug, color: colorId } : undefined,
        });
      }
      router.push("/cart");
    } catch {
      toast.error("Could not save your design, please try again");
      setBusy(false);
    }
  };

  // Summary figures, using the same pricing rules the checkout charges
  const unit = garmentUnitPrice(product.price, qty);
  const garmentTotal = unit * qty;
  const printTotal = print && logo ? CUSTOMIZATION_FEE * qty : 0;
  const discount = bulkDiscount(qty);

  // Share links are built on click, from the page's current URL (it carries the collar color)
  const share = (to: "copy" | "whatsapp" | "email" | "linkedin") => {
    const url = window.location.href;
    const text = `My COTTSON ${product.title} design: ${url}`;
    if (to === "copy") return navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
    if (to === "email")
      return window.location.assign(`mailto:?subject=${encodeURIComponent(`COTTSON ${product.title} design`)}&body=${encodeURIComponent(text)}`);
    window.open(
      to === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(text)}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener"
    );
  };

  const slides = [
    {
      label: "Front",
      body: (editable: boolean) => (
        // Photo backgrounds are white, so the frame is too
        <div className="relative grid size-full place-items-center overflow-hidden bg-white">
          <GarmentPhoto ref={editable ? frameRef : undefined} product={product} colorId={colorId} focus={focus ?? CHEST_VIEW}>
            {print && logo && logoArt && (
              <LogoLayer
                src={logoArt}
                embroidered={!!embroidered}
                fabricSrc={variantUrl(product, colorId)}
                blend={blendFor(fabric, print.thread ? [print.thread] : logo.palette.slice(0, finishing?.maxColors ?? 2))}
                frame={frame}
                placement={print.placement}
                aspect={logo.aspect}
                maxWidth={maxW}
                onChange={onPlacement}
                editable={editable && active === "front"}
                frameRef={frameRef}
                zoom={(focus ?? CHEST_VIEW).z}
              />
            )}
          </GarmentPhoto>
          {editable && print && logo && (
            <button
              type="button"
              onClick={() => setFocus((f) => (f ? null : focusOn(frame, print.placement, logo.aspect)))}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-brand shadow-sm hover:bg-muted"
            >
              {focus ? <ZoomOut className="size-3.5" /> : <ZoomIn className="size-3.5" />}
              {focus ? "Zoom out" : "Zoom to logo"}
            </button>
          )}
        </div>
      ),
    },
    ...(print && logo && logoArt
      ? [
          {
            label: embroidered ? "Stitch close-up" : "Print close-up",
            body: () => (
              <div className="relative size-full">
                <FabricCloseup fabric={fabric} logo={logoArt} aspect={logo.aspect} rotation={print.placement.rotation} embroidered={!!embroidered} />
                {embroidered && art.pending && (
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-brand">
                    <Loader2 className="size-3 animate-spin" /> Stitching…
                  </div>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];
  const current = Math.min(slide, slides.length - 1);

  return (
    <div className="bg-[#eceef3]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:pt-32">
        {/* Header: back, title, and the studio actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/products/${product.slug}?color=${colorId}`}
              aria-label="Back to product"
              className="grid size-10 place-items-center rounded-lg bg-white text-brand shadow-sm hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Design studio</div>
              <h1 className="text-xl font-bold text-brand">Create it yourself!</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={startOver} className="flex h-10 items-center gap-2 rounded-lg bg-white px-3.5 text-sm font-semibold text-brand shadow-sm hover:bg-muted">
              <RotateCcw className="size-4" /> Start over
            </button>
            <button type="button" onClick={saveDesign} className="flex h-10 items-center gap-2 rounded-lg bg-white px-3.5 text-sm font-semibold text-brand shadow-sm hover:bg-muted">
              <Save className="size-4" /> Save design
            </button>
            <button
              type="button"
              onClick={checkout}
              disabled={busy}
              className="flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Checkout <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)_290px]">
          {/* Left column: product + the selected customization's settings */}
          <div className="order-2 space-y-6 lg:order-1">
            <Card>
              <CardTitle>Product</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Choose the product you want to design.</p>
              <div className="mt-4">
                <PillSelect
                  label="Product"
                  value={product.slug}
                  options={products.map((p) => ({ value: p.slug, label: p.title }))}
                  onChange={(slug) => router.push(`/studio?product=${slug}`)}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setSizesOpen(true)} className="flex-1 rounded-lg bg-muted px-3 py-1.5 text-left">
                  <div className="text-[11px] text-muted-foreground">Amount</div>
                  <div className="text-sm font-semibold tabular-nums">{qty}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSizesOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-muted px-4 text-sm font-semibold text-brand hover:bg-muted/70"
                >
                  <Pencil className="size-3.5" /> Sizes
                </button>
              </div>
              {qty < product.minBulk && (
                <p className="mt-2 text-xs text-muted-foreground">Minimum order: {product.minBulk} pieces.</p>
              )}
            </Card>

            {active === "overview" || !print ? (
              <Card>
                <CardTitle>Overview</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Define the collar color of your product.</p>
                <div className="mt-4 text-sm font-medium">Collar color — {color.name}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.colors.map((id) => {
                    const c = colorById(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setColorId(id);
                          window.history.replaceState(null, "", `?color=${id}`);
                        }}
                        aria-label={c.name}
                        title={c.name}
                        className={cn(
                          "size-10 rounded-md border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] transition-shadow",
                          colorId === id && "shadow-[0_0_0_2px_var(--color-brand)]"
                        )}
                        style={{ background: c.hex }}
                      />
                    );
                  })}
                </div>
              </Card>
            ) : (
              <Card>
                <CardTitle>Front Print</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Add a finishing to your product.</p>
                <div className="mt-4 space-y-2.5">
                  <PillSelect
                    label="Finishing"
                    value={print.finishingId}
                    options={FINISHINGS.map((f) => ({ value: f.id, label: `${f.label} - ${finishingHint(f)}` }))}
                    onChange={changeFinishing}
                  />
                  <PillSelect
                    label="Position"
                    value={print.positionId}
                    options={POSITIONS.map((p) => ({ value: p.id, label: p.label }))}
                    onChange={changePosition}
                  />

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                    {logo ? (
                      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                        <img src={logo.src} alt="" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <FolderOpen className="ml-1 size-5 shrink-0 text-amber-500" />
                    )}
                    <button type="button" onClick={() => fileRef.current?.click()} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-semibold text-brand">{logo ? logo.name : "Upload graphic"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {logo ? "Click to replace" : "PNG, JPG or SVG"}
                      </div>
                    </button>
                    {logo ? (
                      <button
                        type="button"
                        onClick={() => {
                          updatePrint({ logo: null, thread: null });
                          setPositionOpen(false);
                          setSlide(0);
                          setFocus(null);
                        }}
                        aria-label="Remove graphic"
                        className="grid size-9 shrink-0 place-items-center rounded-md bg-white text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        aria-label="Upload graphic"
                        className="grid size-9 shrink-0 place-items-center rounded-md bg-white text-brand hover:bg-white/70"
                      >
                        <Upload className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                {logo && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPositionOpen(true)}
                      className="mt-2.5 flex h-11 w-full items-center gap-2 rounded-lg bg-muted px-3 text-sm font-semibold text-brand hover:bg-muted/70"
                    >
                      <Move className="size-4" /> Position graphic
                    </button>

                    <div className="mt-4 text-xs font-medium text-muted-foreground">Logo colors</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {print.thread ? (
                        <Chip hex={print.thread} />
                      ) : (
                        // Embroidery stitches only as many colors as the tier allows
                        (embroidered ? logo.palette.slice(0, finishing?.maxColors) : logo.palette).map((hex) => <Chip key={hex} hex={hex} />)
                      )}
                    </div>
                    {embroidered && !print.thread && logo.palette.length > (finishing?.maxColors ?? 99) && (
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                        Reduced to {finishing?.maxColors} thread colors ({logo.palette.length} in your logo).
                      </p>
                    )}
                    <div className="mt-2.5 grid gap-2">
                      <button
                        type="button"
                        onClick={() => (print.thread ? updatePrint({ thread: null }) : monochrome())}
                        className="h-10 rounded-lg bg-muted px-3 text-left text-sm font-semibold text-brand hover:bg-muted/70"
                      >
                        {print.thread ? "Use original logo colors" : "Make logo monochrome"}
                      </button>
                      <label className="relative flex h-10 cursor-pointer items-center justify-between rounded-lg bg-muted px-3 text-sm font-semibold text-brand hover:bg-muted/70">
                        Pick custom color
                        <span className="size-5 rounded-full border-2 border-white shadow" style={{ background: print.thread ?? "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
                        <input
                          type="color"
                          value={print.thread ?? "#ffffff"}
                          onChange={(e) => updatePrint({ thread: e.target.value })}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>

          {/* Centre: product title, description and the preview gallery */}
          <div className="order-1 min-w-0 lg:order-2">
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-brand sm:text-5xl">
              COTTSON<span className="text-brand-accent">.</span> {product.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-brand">
              {[`MOQ ${product.minBulk} pieces`, "Delivered in 7–10 days", "Made in Mumbai"].map((t) => (
                <span key={t} className="rounded-full border border-brand/20 bg-white/60 px-2.5 py-1">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-6">
              {showAll ? (
                <>
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAll(false)}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-white px-2.5 text-xs font-semibold text-brand shadow-sm"
                    >
                      <ChevronsUpDown className="size-3.5" /> Show one
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {slides.map((s, i) => (
                      <div key={s.label} className="relative aspect-square overflow-hidden rounded-xl bg-white">
                        {s.body(i === 0)}
                        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/45 px-2 py-0.5 text-sm font-bold text-white backdrop-blur-sm">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
                  {slides[current].body(current === 0)}
                  <div className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-black/45 px-2.5 py-0.5 text-base font-bold text-white backdrop-blur-sm">
                    {slides[current].label}
                  </div>
                  <div className="absolute left-4 top-4 flex gap-1.5">
                    {slides.map((s, i) => (
                      <button
                        key={s.label}
                        type="button"
                        aria-label={`Show ${s.label}`}
                        onClick={() => setSlide(i)}
                        className={cn("size-3 rounded-full bg-black/15 shadow-sm ring-1 ring-white", i === current && "bg-brand")}
                      />
                    ))}
                  </div>
                  <div className="absolute right-4 top-4 flex gap-1.5">
                    <button
                      type="button"
                      aria-label="Previous image"
                      disabled={current === 0}
                      onClick={() => setSlide(current - 1)}
                      className="grid size-8 place-items-center rounded-md bg-white text-brand shadow-sm disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      disabled={current === slides.length - 1}
                      onClick={() => setSlide(current + 1)}
                      className="grid size-8 place-items-center rounded-md bg-white text-brand shadow-sm disabled:opacity-40"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-white px-2.5 text-xs font-semibold text-brand shadow-sm"
                    >
                      <ChevronsUpDown className="size-3.5" /> Show all
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand shadow-sm">
                <Smile className="size-4" /> Do you like this tool?
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Feedback on the COTTSON design studio: ")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-accent underline underline-offset-2"
                >
                  Give us feedback!
                </a>
              </div>
            </div>
          </div>

          {/* Right column: cost summary and the list of customizations */}
          <div className="order-3 space-y-6">
            <Card>
              <CardTitle>Summary</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">See the full overview of your cost.</p>
              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt>
                    {product.title} × {qty}
                    {discount > 0 && <span className="block text-muted-foreground">{Math.round(discount * 100)}% bulk discount</span>}
                  </dt>
                  <dd className="shrink-0 font-semibold tabular-nums">{formatPrice(garmentTotal, product.currency)}</dd>
                </div>
                {print && logo && (
                  <div className="flex justify-between gap-3">
                    <dt>Front print · {finishing?.label}</dt>
                    <dd className="shrink-0 font-semibold tabular-nums">{formatPrice(printTotal, product.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t pt-2.5 text-sm">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-bold tabular-nums text-brand">{formatPrice(garmentTotal + printTotal, product.currency)}</dd>
                </div>
              </dl>
              {qty === 0 && <p className="mt-2 text-[11px] text-muted-foreground">Add sizes to see your total.</p>}
            </Card>

            <Card className="p-0">
              <div className="p-5 pb-3">
                <CardTitle>Customizations</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Make your product special.</p>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mt-4 flex h-9 items-center gap-2 rounded-lg bg-brand/85 px-3 text-sm font-semibold text-white hover:bg-brand"
                >
                  <CirclePlus className="size-4" /> Add customization
                </button>
              </div>
              <ul className="pb-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setActive("overview")}
                    className={cn(
                      "flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left",
                      active === "overview" || !print ? "border-brand bg-muted/70" : "border-transparent hover:bg-muted/40"
                    )}
                  >
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image src={variantUrl(product, colorId)} alt="" fill sizes="44px" className="object-cover" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-brand">Overview</div>
                      <div className="text-[11px] text-muted-foreground">
                        <b className="text-foreground">{formatPrice(0, product.currency)}</b> per piece
                      </div>
                    </div>
                  </button>
                </li>
                {print && (
                  <li className="relative">
                    <button
                      type="button"
                      onClick={() => setActive("front")}
                      className={cn(
                        "flex w-full items-center gap-3 border-l-[3px] px-4 py-3 pr-14 text-left",
                        active === "front" ? "border-brand bg-muted/70" : "border-transparent hover:bg-muted/40"
                      )}
                    >
                      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-brand">
                        {logo && logoArt ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local data URL
                          <img src={logoArt} alt="" className="max-h-[80%] max-w-[80%] object-contain" />
                        ) : (
                          <Upload className="size-4 text-white/80" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-brand">Front Print</div>
                        <div className="text-[11px] text-muted-foreground">
                          <b className="text-foreground">{formatPrice(CUSTOMIZATION_FEE, product.currency)}</b> per piece
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={removePrint}
                      aria-label="Remove front print"
                      className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md bg-white text-brand-accent shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                )}
              </ul>
            </Card>

            <Card>
              <CardTitle>Share your designs</CardTitle>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-brand">
                {(
                  [
                    ["copy", "Copy link", <Copy key="i" className="size-3.5" />],
                    ["whatsapp", "WhatsApp", null],
                    ["email", "E-mail", <Mail key="i" className="size-3.5" />],
                    ["linkedin", "LinkedIn", null],
                  ] as const
                ).map(([to, label, icon]) => (
                  <button
                    key={to}
                    type="button"
                    onClick={() => share(to)}
                    className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 hover:bg-muted/70"
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {positionOpen && print && logo && logoArt && finishing && (
        <PositionDialog
          frame={frame}
          logoSrc={logoArt}
          aspect={logo.aspect}
          finishing={finishing}
          placement={print.placement}
          positionId={print.positionId}
          onClose={() => setPositionOpen(false)}
          onApply={(placement, positionId) => {
            updatePrint({ placement, positionId });
            setPositionOpen(false);
            setSlide(0);
            setFocus(focusOn(frame, placement, logo.aspect));
          }}
        />
      )}

      {/* Size selection drawer */}
      <Sheet open={sizesOpen} onOpenChange={setSizesOpen}>
        <SheetContent side="right" className="w-full gap-0 bg-[#f7f8fa] p-6 sm:max-w-md">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Select your sizes</div>
          <SheetTitle className="text-xl font-bold text-brand">Size selection</SheetTitle>
          <div className="mt-5 space-y-2 overflow-y-auto">
            {product.sizes.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <label className="w-28 rounded-lg bg-white px-3 py-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
                  <span className="block text-[11px] text-muted-foreground">Amount</span>
                  <input
                    inputMode="numeric"
                    value={sizes[s] ?? 0}
                    onChange={(e) => setSizes((p) => ({ ...p, [s]: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)) }))}
                    className="w-full bg-transparent text-sm font-semibold tabular-nums outline-none"
                  />
                </label>
                <span className="flex-1 text-sm font-bold">{s}</span>
                <button
                  type="button"
                  aria-label={`Fewer ${s}`}
                  onClick={() => setSizes((p) => ({ ...p, [s]: Math.max(0, (p[s] ?? 0) - 1) }))}
                  className="grid size-9 place-items-center rounded-md bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)] hover:bg-muted"
                >
                  <Minus className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`More ${s}`}
                  onClick={() => setSizes((p) => ({ ...p, [s]: (p[s] ?? 0) + 1 }))}
                  className="grid size-9 place-items-center rounded-md bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)] hover:bg-muted"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 text-sm font-bold">
            Total: {qty}
            {qty > 0 && qty < product.minBulk && (
              <span className="ml-2 font-normal text-muted-foreground">(minimum {product.minBulk})</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSizesOpen(false)}
            className="mt-4 h-11 w-full rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand/90"
          >
            Save
          </button>
        </SheetContent>
      </Sheet>

      {/* Add-ons drawer */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full gap-0 bg-[#f7f8fa] p-6 sm:max-w-md">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Design studio | Add-ons</div>
          <SheetTitle className="text-xl font-bold text-brand">Add customizations</SheetTitle>
          <div className="mt-5 space-y-3">
            {[
              { id: "front", title: "Front print", desc: "Your logo on the chest, embroidered or printed.", available: true },
              { id: "back", title: "Back print", desc: "Large print across the back.", available: false },
            ].map((a) => {
              const added = a.id === "front" && !!print;
              return (
                <div key={a.id} className="flex items-center gap-3 overflow-hidden rounded-xl bg-white pr-3 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
                  <div className="relative size-20 shrink-0 bg-muted">
                    <Image src={variantUrl(product, colorId)} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 py-2">
                    <div className="text-sm font-bold text-brand">{a.title}</div>
                    <div className="text-[11px]">
                      <b>{formatPrice(CUSTOMIZATION_FEE, product.currency)}</b> per piece
                    </div>
                    <div className="text-[11px] text-muted-foreground">{a.desc}</div>
                  </div>
                  {a.available ? (
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => {
                        setPrint(newPrint(frame));
                        setActive("front");
                        setAddOpen(false);
                      }}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-muted px-2.5 text-xs font-semibold text-brand hover:bg-muted/70 disabled:opacity-50"
                    >
                      {added ? "Added" : (<><CirclePlus className="size-3.5" /> Add</>)}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-md bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">Coming soon</span>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

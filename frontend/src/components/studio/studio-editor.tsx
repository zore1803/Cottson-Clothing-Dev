"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, Type, Trash2, Download, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type Konva from "konva";
import { PRODUCTS, colorById, getProduct, formatPrice, type ProductMeta } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { CUSTOMIZATION_FEE } from "@/lib/pricing";
import { RecolorCanvas, type RecolorHandle } from "@/components/recolor-canvas";
import { ColorSwatches } from "@/components/color-swatches";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DesignElement } from "./design-layer";

// Konva needs the browser (canvas), so it is never rendered on the server
const DesignLayer = dynamic(() => import("./design-layer"), { ssr: false });

const TEXT_COLORS = ["#ffffff", "#111111", "#c8102e", "#f5c518", "#1d3fd6", "#0b4d4a"];

export function StudioEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const product = getProduct(params.get("product") ?? "") ?? PRODUCTS[0];
  const [colorId, setColorId] = useState(
    params.get("color") && product.colors.includes(params.get("color")!) ? params.get("color")! : product.originalColor
  );
  const [meta, setMeta] = useState<ProductMeta | null>(null);
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [displayWidth, setDisplayWidth] = useState(0);

  const recolorRef = useRef<RecolorHandle>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addToCart = useCart((s) => s.add);

  // Keep the Konva stage the same size as the displayed garment
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDisplayWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Delete key removes the selected element
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !(e.target instanceof HTMLInputElement)) {
        setElements((els) => els.filter((x) => x.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const color = colorById(colorId);
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const top = meta?.parts.top;
  // Printable chest area: middle of the garment, upper part
  const printArea: [number, number, number, number] | null = top
    ? (() => {
        const [x0, y0, x1, y1] = top.bbox;
        const w = x1 - x0, h = y1 - y0;
        return [x0 + w * 0.22, y0 + h * 0.12, x1 - w * 0.22, y0 + h * 0.62];
      })()
    : null;

  const switchProduct = (slug: string) => {
    const p = getProduct(slug)!;
    setElements([]);
    setSelectedId(null);
    setMeta(null);
    setColorId(p.originalColor);
    router.replace(`/studio?product=${slug}`);
  };

  const addImage = (file: File) => {
    if (!printArea) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = (printArea[2] - printArea[0]) * 0.6;
        const w = Math.min(maxW, img.width);
        const h = (w * img.height) / img.width;
        const id = crypto.randomUUID();
        setElements((els) => [
          ...els,
          { id, type: "image", src: reader.result as string, x: (printArea[0] + printArea[2]) / 2 - w / 2, y: printArea[1] + 20, width: w, height: h, rotation: 0 },
        ]);
        setSelectedId(id);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addText = () => {
    if (!printArea) return;
    const id = crypto.randomUUID();
    const fontSize = Math.round((printArea[2] - printArea[0]) / 7);
    setElements((els) => [
      ...els,
      { id, type: "text", text: "YOUR TEXT", fill: color.hex === "#f5f5f2" ? "#111111" : "#ffffff", fontSize, fontStyle: "bold", x: printArea[0] + 10, y: printArea[1] + 40, rotation: 0 },
    ]);
    setSelectedId(id);
  };

  const update = (el: DesignElement) => setElements((els) => els.map((x) => (x.id === el.id ? el : x)));

  /** Garment (PixiJS canvas) + design (Konva stage) flattened at full photo resolution */
  const compose = (maxWidth?: number) => {
    const garment = recolorRef.current?.getCanvas();
    const stage = stageRef.current;
    if (!garment || !meta) return null;
    const out = document.createElement("canvas");
    const s = maxWidth ? Math.min(1, maxWidth / meta.width) : 1;
    out.width = Math.round(meta.width * s);
    out.height = Math.round(meta.height * s);
    const ctx = out.getContext("2d")!;
    ctx.drawImage(garment, 0, 0, out.width, out.height);
    if (stage) {
      const tr = stage.findOne(".transformer");
      const guide = stage.findOne(".guide");
      tr?.hide();
      guide?.hide();
      const design = stage.toCanvas({ pixelRatio: out.width / stage.width() });
      tr?.show();
      guide?.show();
      ctx.drawImage(design, 0, 0, out.width, out.height);
    }
    return out;
  };

  const download = () => {
    const c = compose();
    if (!c) return;
    const a = document.createElement("a");
    a.download = `cottson-${product.slug}-${colorId}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  const addDesignToCart = async () => {
    if (!size) return toast.error("Please choose a size");
    const preview = compose(400)?.toDataURL("image/jpeg", 0.8);
    const customized = elements.length > 0;
    // Save the design to MongoDB so the order can reference it
    let designId: string | undefined;
    if (customized) {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: product.slug, color: colorId, width: meta?.width, height: meta?.height, elements, preview }),
      });
      if (!res.ok) return toast.error("Could not save your design, please try again");
      designId = (await res.json()).id;
    }
    addToCart({
      designId,
      slug: product.slug,
      title: product.title + (customized ? " (custom)" : ""),
      colorId,
      colorName: color.name,
      size,
      qty: 1,
      basePrice: product.price,
      preview,
      design: customized ? { product: product.slug, color: colorId } : undefined,
    });
    toast.success("Added your design to the cart");
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div>
        <div ref={boxRef} className="relative mx-auto w-full max-w-[640px] overflow-hidden rounded-2xl">
          <RecolorCanvas
            key={product.slug}
            ref={recolorRef}
            slug={product.slug}
            topColor={colorId === product.originalColor ? null : color.hex}
            onReady={setMeta}
          />
          {meta && displayWidth > 0 && (
            <DesignLayer
              width={meta.width}
              height={meta.height}
              displayWidth={displayWidth}
              elements={elements}
              selectedId={selectedId}
              printArea={printArea}
              onSelect={setSelectedId}
              onChange={update}
              stageRef={stageRef}
            />
          )}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Dashed box = print area · drag to move · corners to resize and rotate · Delete to remove</p>
      </div>

      <aside className="space-y-7">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Design Studio</h1>
          <p className="text-sm text-muted-foreground">
            {product.title} · {formatPrice(product.price + (elements.length ? CUSTOMIZATION_FEE : 0))}
            {elements.length > 0 && " incl. customization"}
          </p>
        </div>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</h2>
          <div className="mt-3 flex gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.slug}
                onClick={() => switchProduct(p.slug)}
                className={cn("rounded-lg border px-4 py-2 text-sm", p.slug === product.slug ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
              >
                {p.title}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Garment color <span className="ml-1 normal-case tracking-normal text-foreground">{color.name}</span>
          </h2>
          <div className="mt-3">
            <ColorSwatches colorIds={product.colors} value={colorId} onChange={setColorId} />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your design</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>
              <ImagePlus /> Upload logo
            </Button>
            <Button variant="outline" className="h-10" onClick={addText}>
              <Type /> Add text
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addImage(f);
              e.target.value = "";
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">A PNG with a transparent background looks best.</p>

          {selected && (
            <div className="mt-4 space-y-3 rounded-xl border p-3">
              {selected.type === "text" && (
                <>
                  <input
                    value={selected.text}
                    onChange={(e) => update({ ...selected, text: e.target.value })}
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    aria-label="Text"
                  />
                  <div className="flex items-center gap-2">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        aria-label={`Text color ${c}`}
                        onClick={() => update({ ...selected, fill: c })}
                        className={cn("size-7 rounded-full ring-1 ring-border", selected.fill === c && "ring-2 ring-foreground")}
                        style={{ background: c }}
                      />
                    ))}
                    <button
                      onClick={() => update({ ...selected, fontStyle: selected.fontStyle === "bold" ? "normal" : "bold" })}
                      className="ml-auto rounded-md border px-2 py-1 text-xs font-bold"
                    >
                      B
                    </button>
                  </div>
                </>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setElements((els) => els.filter((x) => x.id !== selected.id));
                  setSelectedId(null);
                }}
              >
                <Trash2 /> Remove
              </Button>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={cn("h-10 min-w-12 rounded-lg border px-3 text-sm", size === s ? "border-foreground bg-foreground text-background" : "hover:border-foreground")}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-2">
          <Button size="lg" className="h-11" onClick={addDesignToCart}>
            <ShoppingBag /> Add to cart
          </Button>
          <Button size="lg" variant="outline" className="h-11" onClick={download}>
            <Download /> Download mockup
          </Button>
        </div>
      </aside>
    </div>
  );
}

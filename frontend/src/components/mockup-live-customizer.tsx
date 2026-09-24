"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ImageIcon, Palette, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Fixed set of pre-made collar-trim photos — swapped between directly, no live pixel
// recolor. Only the ones with a photo are wired up; the rest show a placeholder until
// those photos are made.
const PRESETS = [
  { name: "Green Trim", hex: "#7ac142", photo: "/mockup/polo-green.png" },
  { name: "Black Trim", hex: "#1c1c1c", photo: null },
  { name: "Navy Trim", hex: "#1f2a44", photo: null },
  { name: "Red Trim", hex: "#c8102e", photo: "/mockup/polo-red.png" },
  { name: "White Trim", hex: "#f5f5f2", photo: null },
] as const;

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const MIN_ORDER = 25;
const UNIT_PRICE = 499;

export function MockupLiveCustomizer() {
  const [selected, setSelected] = useState<(typeof PRESETS)[number]>(PRESETS[0]);
  const [sizes, setSizes] = useState<Record<string, number>>({});

  const totalQty = Object.values(sizes).reduce((n, q) => n + q, 0);
  const setSize = (s: string, qty: number) => setSizes((prev) => ({ ...prev, [s]: Math.max(0, qty) }));

  const addToBasket = () => {
    if (totalQty < MIN_ORDER) {
      toast.error(`Minimum order is ${MIN_ORDER} pieces (you have ${totalQty})`);
      return;
    }
    toast.success(`Added ${totalQty} × Essential Polo (${selected.name}) to basket`);
  };

  return (
    <div className="grid gap-10 overflow-hidden rounded-2xl border lg:grid-cols-2">
      {/* Left: big product photo with carousel-style controls (single view for now) */}
      <div className="relative bg-muted">
        <div className="relative aspect-[3/4] w-full">
          {selected.photo ? (
            <Image
              key={selected.photo}
              src={selected.photo}
              alt={`Essential Polo — ${selected.name}`}
              fill
              sizes="600px"
              className="animate-in fade-in object-contain duration-200"
            />
          ) : (
            <div className="grid size-full place-items-center border-2 border-dashed text-muted-foreground">
              <div className="text-center">
                <ImageIcon className="mx-auto size-6" strokeWidth={1.5} />
                <p className="mt-2 text-xs">{selected.name} photo coming soon</p>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled
          className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-muted-foreground shadow-sm disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          disabled
          className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-muted-foreground shadow-sm disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          <span className="size-2 rounded-full bg-brand" />
          <span className="size-2 rounded-full bg-foreground/20" />
          <span className="size-2 rounded-full bg-foreground/20" />
        </div>
      </div>

      {/* Right: title, design studio CTA, trim color, sizes, price + add to basket */}
      <div className="p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-brand">
          COTTSON<span className="text-brand-accent">.</span> Essential Polo
        </h2>

        <Link
          href="/studio"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand/90"
        >
          <Palette className="size-4" /> Design Studio — design it yourself!
        </Link>

        <div className="mt-8">
          <div className="text-sm font-semibold text-brand">1. Collar color — {selected.name}</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => setSelected(p)}
                aria-label={p.name}
                title={p.name}
                className={cn(
                  "size-9 rounded-full ring-1 ring-border transition-shadow",
                  selected.hex === p.hex && "ring-2 ring-offset-2 ring-brand"
                )}
                style={{ background: p.hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold text-brand">2. Choose sizes (min. order {MIN_ORDER})</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SIZES.map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg border px-3 py-2">
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
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <div className="text-sm">
            <div className="text-muted-foreground">Lead time</div>
            <div className="font-semibold text-brand">7–10 business days</div>
            <div className="mt-1 text-muted-foreground">Price</div>
            <div className="font-semibold text-brand">₹{UNIT_PRICE} per piece</div>
          </div>
          <button
            type="button"
            onClick={addToBasket}
            className="h-11 shrink-0 rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:bg-brand/90"
          >
            Add to basket ({totalQty})
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Collar = { id: string; name: string; swatch: string; image: string | null };

// Fixed set of pre-made collar-trim variants — no live color picker. Each image is a
// separately prepared photo (like the green one already supplied); the rest are
// placeholders until those photos are made.
const COLLARS: Collar[] = [
  { id: "green", name: "Green Trim", swatch: "#7ac142", image: "/mockup/polo-green.png" },
  { id: "black", name: "Black Trim", swatch: "#1c1c1c", image: null },
  { id: "navy", name: "Navy Trim", swatch: "#1f2a44", image: null },
  { id: "red", name: "Red Trim", swatch: "#c8102e", image: null },
  { id: "white", name: "White Trim", swatch: "#f5f5f2", image: null },
];

export function MockupCustomizer() {
  const [selected, setSelected] = useState(COLLARS[0]);

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl bg-muted">
        {selected.image ? (
          <Image
            key={selected.id}
            src={selected.image}
            alt={`Essential Polo — ${selected.name}`}
            fill
            sizes="480px"
            className="animate-in fade-in object-contain duration-300"
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

      <div>
        <h2 className="text-2xl font-semibold text-brand">Essential Polo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a collar trim color. Sleeve trim colors and different trim patterns are coming next.
        </p>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collar color — {selected.name}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {COLLARS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                aria-label={c.name}
                title={c.name}
                className={cn(
                  "size-10 rounded-full ring-1 ring-border transition-shadow",
                  selected.id === c.id && "ring-2 ring-offset-2 ring-brand"
                )}
                style={{ background: c.swatch }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

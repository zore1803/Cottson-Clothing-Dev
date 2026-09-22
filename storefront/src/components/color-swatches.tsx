"use client";

import { colorById } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ColorSwatches({
  colorIds,
  value,
  onChange,
  size = "md",
}: {
  colorIds: string[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {colorIds.map((id) => {
        const c = colorById(id);
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-full border-2 border-background ring-1 ring-border transition-transform hover:scale-110",
              size === "sm" ? "size-5" : "size-9",
              active && "ring-2 ring-foreground"
            )}
            style={{ background: c.hex }}
          />
        );
      })}
    </div>
  );
}

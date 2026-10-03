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
              "rounded-full ring-1 ring-inset ring-black/15 transition-transform hover:scale-110",
              size === "sm" ? "size-4 shadow-sm" : "size-9 border-2 border-background ring-border",
              active && (size === "sm" ? "ring-2 ring-offset-1 ring-offset-white ring-brand" : "ring-2 ring-foreground")
            )}
            style={{ background: c.hex }}
          />
        );
      })}
    </div>
  );
}

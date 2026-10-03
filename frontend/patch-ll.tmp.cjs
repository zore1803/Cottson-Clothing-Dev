const fs = require("fs");
const f = "src/components/design-studio/logo-layer.tsx";
let s = fs.readFileSync(f, "utf8");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, b); };
rep(`import { useRef, useState } from "react";`, `import { useEffect, useRef, useState } from "react";`);
rep(`import { useFabricColor } from "./garment-photo";
import { relativeLuminance } from "@/lib/contrast";`, `import { relativeLuminance } from "@/lib/contrast";
import { useConformedArt } from "./use-conformed-art";`);
rep(`  /** Current photo zoom, so the selection box and handles stay the same size on screen */
  zoom?: number;
};`, `  /** Current photo zoom, so the selection box and handles stay the same size on screen */
  zoom?: number;
  /** Embroidery: bend the logo with the fabric (folds, pattern, torso curve); false shows it flat */
  conformed?: boolean;
};`);
rep(`  frameRef,
  zoom = 1,
}: Props) {`, `  frameRef,
  zoom = 1,
  conformed = true,
}: Props) {`);
rep(`  // Brightness of the fabric right under the logo (rounded so dragging doesn't resample every px)
  const fabric = useFabricColor(
    fabricSrc ?? "",
    Math.round(((x + w / 2) / frame.w) * 50) / 50,
    Math.round(((y + h / 2) / frame.h) * 50) / 50
  );
  const fabricLum = (() => {
    const [r, g, b] = (fabric.match(/\d+/g) ?? ["128", "128", "128"]).map(Number);
    return Math.max(0.06, (0.299 * r + 0.587 * g + 0.114 * b) / 255);
  })();
  // Multiply already lets the folds through; opaque thread gets them transferred on top
  const shadeFabric = embroidered && !!fabricSrc && blend === "normal";`, `  // Embroidery is drawn conformed to the fabric under it (lib/conform.ts), on a canvas rendered
  // at the size it's shown; until the first render is ready the plain stitch image stands in
  const { art: conformedArt } = useConformedArt({
    src,
    fabricSrc,
    frame,
    placement,
    aspect,
    zoom,
    frameRef,
    conformed,
    blend,
    enabled: embroidered && !!fabricSrc,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !conformedArt) return;
    c.width = conformedArt.canvas.width;
    c.height = conformedArt.canvas.height;
    c.getContext("2d")!.drawImage(conformedArt.canvas, 0, 0);
  }, [conformedArt]);`);
fs.writeFileSync(f, s);

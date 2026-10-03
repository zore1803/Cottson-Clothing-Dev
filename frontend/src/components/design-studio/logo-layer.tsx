"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { round1, type Frame, type Placement } from "./placement";
import { relativeLuminance } from "@/lib/contrast";
import { useConformedArt } from "./use-conformed-art";

type Props = {
  /** What to draw: the flat logo (print) or the rendered stitch image (embroidery) */
  src: string;
  embroidered: boolean;
  /** The garment photo under the logo; lets embroidery pick up the fabric's folds and shadows */
  fabricSrc?: string;
  /** How the logo meets the fabric. "multiply" (light shirts, thread darker than the shirt):
   * the shirt's own shading shows straight through. "normal": the thread is opaque and the
   * shading is transferred onto it instead. See blendFor(). */
  blend?: "multiply" | "normal";
  /** Real-world size of the photo frame (placement.ts) */
  frame: Frame;
  placement: Placement;
  /** Logo width / height */
  aspect: number;
  maxWidth: number;
  onChange: (p: Placement) => void;
  /** Show the selection box + handles and accept drags */
  editable?: boolean;
  /** Reference element the percentages are measured against (the photo box) */
  frameRef: React.RefObject<HTMLDivElement | null>;
  /** Current photo zoom, so the selection box and handles stay the same size on screen */
  zoom?: number;
  /** Embroidery: bend the logo with the fabric (folds, pattern, torso curve); false shows it flat */
  conformed?: boolean;
};

const MIN_WIDTH_CM = 1.5;

/** Multiply lets the fabric's folds show through the logo, but it can only darken: thread
 * lighter than the shirt (white on light blue) would take on the shirt's color. So multiply only
 * on light shirts, and only when every thread color is clearly darker than the shirt; dark
 * shirts (and light thread) get opaque thread with the shading transferred on top. */
export function blendFor(fabric: string, threads: string[]): "multiply" | "normal" {
  const f = relativeLuminance(fabric);
  return f > 0.35 && threads.length > 0 && threads.every((t) => relativeLuminance(t) < f * 0.75) ? "multiply" : "normal";
}

/** The logo as a selectable element on the garment photo: drag to move, corners to resize.
 * Positioned in cm (see placement.ts) so it lines up the same on every trim-color photo. */
export function LogoLayer({
  src,
  embroidered,
  fabricSrc,
  blend = "normal",
  frame,
  placement,
  aspect,
  maxWidth,
  onChange,
  editable = true,
  frameRef,
  zoom = 1,
  conformed = true,
}: Props) {
  const { x, y, w, rotation } = placement;
  const h = w / aspect;

  // Embroidery is drawn conformed to the fabric under it (lib/conform.ts), on a canvas rendered
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
  }, [conformedArt]);

  // Pointer delta (px) → cm, measured on the frame's on-screen size (includes any zoom transform)
  const pxToCm = () => {
    const rect = frameRef.current?.getBoundingClientRect();
    return rect ? { x: frame.w / rect.width, y: frame.h / rect.height } : { x: 0, y: 0 };
  };
  const clamp = (p: Placement) => {
    const ph = p.w / aspect;
    return {
      ...p,
      x: Math.min(frame.w - p.w, Math.max(0, p.x)),
      y: Math.min(frame.h - ph, Math.max(0, p.y)),
    };
  };

  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ sx: number; sy: number; start: Placement; corner?: string } | null>(null);
  const begin = (corner?: string) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current = { sx: e.clientX, sy: e.clientY, start: placement, corner };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const k = pxToCm();
    const dx = (e.clientX - d.sx) * k.x;
    const dy = (e.clientY - d.sy) * k.y;
    const s = d.start;
    if (!d.corner) return onChange(clamp({ ...s, x: s.x + dx, y: s.y + dy }));
    // Corner resize keeps the aspect ratio and anchors the opposite corner
    const grow = d.corner.includes("right") ? dx : -dx;
    const nw = Math.min(maxWidth, Math.max(MIN_WIDTH_CM, s.w + grow));
    const nh = nw / aspect;
    const sh = s.w / aspect;
    onChange(
      clamp({
        ...s,
        w: nw,
        x: d.corner.includes("left") ? s.x + (s.w - nw) : s.x,
        y: d.corner.includes("top") ? s.y + (sh - nh) : s.y,
      })
    );
  };
  const end = () => {
    drag.current = null;
    setDragging(false);
  };

  const box: React.CSSProperties = {
    left: `${(x / frame.w) * 100}%`,
    top: `${(y / frame.h) * 100}%`,
    width: `${(w / frame.w) * 100}%`,
    height: `${(h / frame.h) * 100}%`,
    transform: `rotate(${rotation}deg)`,
  };

  return (
    <>
      {/* The artwork, in its own layer so it can blend with the photo underneath without also
          blending the selection box, handles and size label drawn over it */}
      <div className="pointer-events-none absolute" style={{ ...box, mixBlendMode: embroidered ? blend : undefined }}>
        {embroidered && conformedArt ? (
          // The canvas carries a transparent margin (so warped edges aren't clipped); it's placed
          // so the logo box inside it lines up with this box. Thread stands on the fabric, so it
          // casts a tight contact shadow (in photo px: it grows with zoom like a real one).
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Your logo, embroidered"
            className="pointer-events-none absolute max-w-none select-none"
            style={{
              left: `${(-conformedArt.pad / conformedArt.bw) * 100}%`,
              top: `${(-conformedArt.pad / conformedArt.bh) * 100}%`,
              width: `${((conformedArt.bw + 2 * conformedArt.pad) / conformedArt.bw) * 100}%`,
              height: `${((conformedArt.bh + 2 * conformedArt.pad) / conformedArt.bh) * 100}%`,
              filter: "drop-shadow(0.4px 0.8px 0.7px rgba(0,0,0,0.45))",
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img
            src={src}
            alt={embroidered ? "Your logo, embroidered" : "Your logo"}
            draggable={false}
            className="pointer-events-none block size-full select-none"
            style={
              embroidered
                ? { filter: "drop-shadow(0.4px 0.8px 0.7px rgba(0,0,0,0.45))" }
                : // Printed ink sits slightly into the knit, so it's a touch less crisp than thread
                  { filter: "saturate(0.95) contrast(0.97)", opacity: 0.94 }
            }
          />
        )}
      </div>

      {/* Controls: drag area, dashed box, corner handles, live size label */}
      <div className="absolute touch-none" style={box}>
        {editable && dragging && (
          <span
            className="pointer-events-none absolute -top-7 left-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background shadow"
            style={{ transform: `translateX(-50%) scale(${1 / zoom})` }}
          >
            {round1(w)} cm wide
          </span>
        )}
        <div
          onPointerDown={begin()}
          onPointerMove={move}
          onPointerUp={end}
          className={cn(
            "relative size-full",
            editable && "cursor-grab rounded-[2px] outline-dashed outline-brand/80 active:cursor-grabbing"
          )}
          style={editable ? { outlineWidth: 1 / zoom, outlineOffset: 2 / zoom } : undefined}
        >
          {editable &&
            (
            [
              ["top-left", "-top-2.5 -left-2.5", "nwse-resize"],
              ["top-right", "-top-2.5 -right-2.5", "nesw-resize"],
              ["bottom-left", "-bottom-2.5 -left-2.5", "nesw-resize"],
              ["bottom-right", "-bottom-2.5 -right-2.5", "nwse-resize"],
            ] as const
          ).map(([corner, pos, cursor]) => (
            // Invisible 20px grab area around a small visible dot
            <div
              key={corner}
              onPointerDown={begin(corner)}
              onPointerMove={move}
              onPointerUp={end}
              className={cn("absolute grid size-5 place-items-center", pos)}
              style={{ cursor, transform: `scale(${1 / zoom})` }}
            >
              <span className="pointer-events-none size-2 rounded-full border border-brand bg-white shadow" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

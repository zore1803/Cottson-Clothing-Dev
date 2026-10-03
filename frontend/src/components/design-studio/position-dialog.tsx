"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  Plus,
  RotateCw,
  X,
} from "lucide-react";
import {
  DEFAULT_FRAME,
  POSITIONS,
  maxWidthFor,
  placeAt,
  positionCenter,
  printArea,
  type Finishing,
  type Frame,
  type Placement,
  type PositionId,
} from "./placement";

const STEP = 0.5;

/** "Centimeter" number box with −/+ steppers; commits typed values on blur / Enter */
function CmField({ label, value, onCommit }: { label: string; value: number; onCommit: (cm: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value.toFixed(2);
  const commit = () => {
    const n = parseFloat(text);
    if (Number.isFinite(n)) onCommit(n);
    setDraft(null);
  };
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <label className="w-[72px] rounded-md bg-muted px-2 py-1 focus-within:ring-2 focus-within:ring-brand/30">
          <span className="block text-[10px] font-medium leading-tight text-brand">Centimeter</span>
          <input
            inputMode="decimal"
            aria-label={`${label} in centimeters`}
            value={text}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-full bg-transparent text-sm tabular-nums outline-none"
          />
        </label>
        <Btn label={`Decrease ${label}`} onClick={() => onCommit(value - STEP)}>
          <Minus className="size-4" />
        </Btn>
        <Btn label={`Increase ${label}`} onClick={() => onCommit(value + STEP)}>
          <Plus className="size-4" />
        </Btn>
      </div>
    </div>
  );
}

const Btn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="grid size-9 place-items-center rounded-md bg-white text-brand shadow-[0_1px_3px_rgba(16,24,40,0.12)] hover:bg-muted"
  >
    {children}
  </button>
);

/** Front of the polo as a technical line drawing, traced over the Essential Polo photo (px of its
 * 682×1024 image, where the frame is 90 cm wide). Drawn at that true-cm scale and shifted so its
 * left chest sits on this product's left-chest point, so the print area lands on the drawn chest. */
function PoloLines({ frame }: { frame: Frame }) {
  const ref = positionCenter(DEFAULT_FRAME, "left-chest");
  const here = positionCenter(frame, "left-chest");
  return (
    <g
      transform={`translate(${here.cx - ref.cx} ${here.cy - ref.cy}) scale(${DEFAULT_FRAME.w / 682})`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Body, shoulders and sleeves */}
      <path
        vectorEffect="non-scaling-stroke"
        d="M238 168 L95 232 Q60 330 30 455 L140 478 M150 470 L150 905 L533 905 L533 470 M444 168 L587 232 Q622 330 652 455 L542 478"
      />
      {/* Armholes */}
      <path vectorEffect="non-scaling-stroke" d="M130 225 Q128 350 150 470 M552 225 Q554 350 533 470" />
      {/* Collar and back neck */}
      <path vectorEffect="non-scaling-stroke" d="M268 120 Q341 150 414 120 M268 120 L238 168 L262 222 L318 200 M414 120 L444 168 L420 222 L364 200" />
      {/* Placket + buttons */}
      <path vectorEffect="non-scaling-stroke" d="M318 200 L318 345 L364 345 L364 200" />
      {[215, 262, 310].map((cy) => (
        <circle key={cy} vectorEffect="non-scaling-stroke" cx={341} cy={cy} r={8} />
      ))}
    </g>
  );
}

/** Graphic positioning, like the reference studio: precise controls on the left, and on the
 * right the print area drawn on the garment with the logo and its size. Edits are a draft
 * until "Apply". */
export function PositionDialog({
  frame,
  logoSrc,
  aspect,
  finishing,
  placement,
  positionId,
  onApply,
  onClose,
}: {
  frame: Frame;
  logoSrc: string;
  aspect: number;
  finishing: Finishing;
  placement: Placement;
  positionId: PositionId;
  onApply: (p: Placement, pos: PositionId) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState(positionId);
  const [p, setP] = useState(placement);
  const area = printArea(frame, pos, finishing);
  const maxW = maxWidthFor(finishing, aspect);
  const h = p.w / aspect;

  // Keep the logo inside the print area (as far as its size allows)
  const set = (next: Partial<Placement>) => {
    const n = { ...p, ...next };
    n.w = Math.min(maxW, Math.max(1, n.w));
    const nh = n.w / aspect;
    n.x = Math.min(area.x + area.size - n.w, Math.max(area.x, n.x));
    n.y = Math.min(area.y + area.size - nh, Math.max(area.y, n.y));
    setP(n);
  };
  // Resizing keeps the logo's centre in place
  const resize = (w: number) => {
    const cw = Math.min(maxW, Math.max(1, w));
    set({ w: cw, x: p.x + (p.w - cw) / 2, y: p.y + (h - cw / aspect) / 2 });
  };

  // The drawing shows the print area with room around it, centred on the area
  const vw = Math.max(area.size * 2.2, 24);
  const vh = vw * 0.8;
  const vx = area.x + area.size / 2 - vw / 2;
  const vy = area.y + area.size / 2 - vh / 2;
  const fs = vw * 0.036; // label font size in cm, so it reads the same at any zoom

  // Drag the logo inside the drawing
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ sx: number; sy: number; start: Placement } | null>(null);
  const cmPerPx = () => 1 / (svgRef.current?.getScreenCTM()?.a ?? 1);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-[#f7f8fa] p-5 shadow-2xl transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:p-7">
          <Dialog.Close
            aria-label="Close"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-md bg-white text-brand shadow-[0_1px_3px_rgba(16,24,40,0.12)] hover:bg-muted"
          >
            <X className="size-4" />
          </Dialog.Close>

          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="order-2 space-y-3 md:order-1">
              <Dialog.Title className="text-xl font-bold text-brand">
                Graphic positioning<span className="text-brand-accent">.</span>
              </Dialog.Title>
              <CmField label="Height" value={h} onCommit={(cm) => resize(cm * aspect)} />
              <CmField label="Width" value={p.w} onCommit={resize} />

              <div>
                <div className="text-xs text-muted-foreground">Standard placements</div>
                <label className="relative mt-1 block">
                  <select
                    value={pos}
                    onChange={(e) => {
                      const id = e.target.value as PositionId;
                      setPos(id);
                      setP(placeAt(frame, id, p.w, aspect, p.rotation));
                    }}
                    className="h-10 w-full appearance-none rounded-md bg-white pl-3 pr-8 text-sm font-semibold text-brand shadow-[0_1px_3px_rgba(16,24,40,0.12)] outline-none"
                  >
                    {POSITIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-brand" />
                </label>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Centering</div>
                <div className="mt-1 flex gap-1.5">
                  <Btn label="Center horizontally" onClick={() => set({ x: area.x + (area.size - p.w) / 2 })}>
                    <AlignCenterVertical className="size-4" />
                  </Btn>
                  <Btn label="Center vertically" onClick={() => set({ y: area.y + (area.size - h) / 2 })}>
                    <AlignCenterHorizontal className="size-4" />
                  </Btn>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Moving</div>
                <div className="mt-1 flex gap-1.5">
                  <Btn label="Move left" onClick={() => set({ x: p.x - STEP })}>
                    <ChevronLeft className="size-4" />
                  </Btn>
                  <Btn label="Move right" onClick={() => set({ x: p.x + STEP })}>
                    <ChevronRight className="size-4" />
                  </Btn>
                  <Btn label="Move up" onClick={() => set({ y: p.y - STEP })}>
                    <ChevronUp className="size-4" />
                  </Btn>
                  <Btn label="Move down" onClick={() => set({ y: p.y + STEP })}>
                    <ChevronDown className="size-4" />
                  </Btn>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Rotate</div>
                <div className="mt-1">
                  <Btn label="Rotate 15°" onClick={() => set({ rotation: (p.rotation + 15) % 360 })}>
                    <RotateCw className="size-4" />
                  </Btn>
                </div>
              </div>

              <CmField label="Top distance" value={p.y - area.y} onCommit={(cm) => set({ y: area.y + cm })} />
              <CmField label="Left distance" value={p.x - area.x} onCommit={(cm) => set({ x: area.x + cm })} />

              <button
                type="button"
                onClick={() => onApply(p, pos)}
                className="h-11 rounded-md bg-brand px-6 text-sm font-semibold text-white hover:bg-brand/90"
              >
                Apply
              </button>
            </div>

            {/* The print area on the garment */}
            <div className="order-1 self-start overflow-hidden rounded-lg bg-[#eef0f6] md:order-2 md:mt-12">
              <svg
                ref={svgRef}
                viewBox={`${vx} ${vy} ${vw} ${vh}`}
                className="block w-full touch-none select-none text-[#111]"
                role="img"
                aria-label={`Print area ${area.size} by ${area.size} cm with your logo`}
              >
                <PoloLines frame={frame} />
                <rect
                  x={area.x}
                  y={area.y}
                  width={area.size}
                  height={area.size}
                  fill="rgba(200,66,107,0.05)"
                  stroke="var(--color-brand-accent)"
                  strokeWidth={1.2}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={area.x + area.size / 2}
                  y={area.y + area.size + fs * 1.4}
                  fontSize={fs}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="var(--color-brand-accent)"
                >
                  {area.size} cm
                </text>
                <text
                  x={area.x - fs * 0.8}
                  y={area.y + area.size / 2}
                  fontSize={fs}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="var(--color-brand-accent)"
                  transform={`rotate(-90 ${area.x - fs * 0.8} ${area.y + area.size / 2})`}
                >
                  {area.size} cm
                </text>

                <g transform={`rotate(${p.rotation} ${p.x + p.w / 2} ${p.y + h / 2})`}>
                  <image
                    href={logoSrc}
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={h}
                    preserveAspectRatio="none"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => {
                      drag.current = { sx: e.clientX, sy: e.clientY, start: p };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const d = drag.current;
                      if (!d) return;
                      const k = cmPerPx();
                      set({ x: d.start.x + (e.clientX - d.sx) * k, y: d.start.y + (e.clientY - d.sy) * k });
                    }}
                    onPointerUp={() => (drag.current = null)}
                  />
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={h}
                    fill="none"
                    stroke="var(--color-brand-accent)"
                    strokeWidth={1}
                    strokeDasharray="1.5 1.5"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                </g>
                {/* Logo size: width underneath, height up the right side */}
                <text x={p.x + p.w / 2} y={p.y + h + fs * 1.15} fontSize={fs * 0.85} fontWeight={700} textAnchor="middle" fill="#111">
                  {p.w.toFixed(2)} cm
                </text>
                <text
                  x={p.x + p.w + fs * 0.75}
                  y={p.y + h / 2}
                  fontSize={fs * 0.85}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="#111"
                  transform={`rotate(90 ${p.x + p.w + fs * 0.75} ${p.y + h / 2})`}
                >
                  {h.toFixed(2)} cm
                </text>
              </svg>
              <p className="px-3 pb-2 text-[11px] text-muted-foreground">
                {finishing.label}: print area {area.size} × {area.size} cm. Drag the logo to move it.
              </p>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

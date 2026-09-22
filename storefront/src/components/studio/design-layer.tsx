"use client";

// Konva layer for the Design Studio: logos and text placed over the PixiJS garment.
// Coordinates are stored in photo pixels, so the saved design is resolution independent
// and the server can render print files from it later.

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Text as KText, Transformer, Rect } from "react-konva";
import type Konva from "konva";

export type DesignElement =
  | { id: string; type: "image"; src: string; x: number; y: number; width: number; height: number; rotation: number }
  | { id: string; type: "text"; text: string; fill: string; fontSize: number; fontStyle: string; x: number; y: number; rotation: number };

type Props = {
  width: number; // photo pixels
  height: number;
  displayWidth: number; // CSS pixels
  elements: DesignElement[];
  selectedId: string | null;
  printArea: [number, number, number, number] | null; // x0, y0, x1, y1 in photo pixels
  onSelect: (id: string | null) => void;
  onChange: (el: DesignElement) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
};

function useHtmlImage(src: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}

function ImageNode({ el, onSelect, onChange, nodeRef }: { el: Extract<DesignElement, { type: "image" }>; onSelect: () => void; onChange: (e: DesignElement) => void; nodeRef: (n: Konva.Node | null) => void }) {
  const img = useHtmlImage(el.src);
  if (!img) return null;
  return (
    <KImage
      ref={nodeRef}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      draggable
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const n = e.target;
        onChange({ ...el, x: n.x(), y: n.y(), rotation: n.rotation(), width: Math.max(10, n.width() * n.scaleX()), height: Math.max(10, n.height() * n.scaleY()) });
        n.scaleX(1);
        n.scaleY(1);
      }}
    />
  );
}

export default function DesignLayer({ width, height, displayWidth, elements, selectedId, printArea, onSelect, onChange, stageRef }: Props) {
  const scale = displayWidth / width;
  const trRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Node>());

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? nodes.current.get(selectedId) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  const setNode = (id: string) => (n: Konva.Node | null) => {
    if (n) nodes.current.set(id, n);
    else nodes.current.delete(id);
  };

  return (
    <Stage
      ref={stageRef}
      width={displayWidth}
      height={height * scale}
      scaleX={scale}
      scaleY={scale}
      className="absolute inset-0"
      onMouseDown={(e) => e.target === e.target.getStage() && onSelect(null)}
      onTouchStart={(e) => e.target === e.target.getStage() && onSelect(null)}
    >
      <Layer>
        {printArea && (
          <Rect
            name="guide"
            x={printArea[0]}
            y={printArea[1]}
            width={printArea[2] - printArea[0]}
            height={printArea[3] - printArea[1]}
            stroke="#ffffff"
            opacity={0.7}
            dash={[12, 8]}
            strokeWidth={2 / scale}
            listening={false}
          />
        )}
        {elements.map((el) =>
          el.type === "image" ? (
            <ImageNode key={el.id} el={el} nodeRef={setNode(el.id)} onSelect={() => onSelect(el.id)} onChange={onChange} />
          ) : (
            <KText
              key={el.id}
              ref={setNode(el.id)}
              text={el.text}
              fill={el.fill}
              fontSize={el.fontSize}
              fontStyle={el.fontStyle}
              fontFamily="Geist, system-ui, sans-serif"
              x={el.x}
              y={el.y}
              rotation={el.rotation}
              draggable
              onMouseDown={() => onSelect(el.id)}
              onTap={() => onSelect(el.id)}
              onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
              onTransformEnd={(e) => {
                const n = e.target;
                onChange({ ...el, x: n.x(), y: n.y(), rotation: n.rotation(), fontSize: Math.max(8, el.fontSize * n.scaleY()) });
                n.scaleX(1);
                n.scaleY(1);
              }}
            />
          )
        )}
        <Transformer
          ref={trRef}
          name="transformer"
          keepRatio
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          anchorSize={10}
          borderStroke="#0b4d4a"
          anchorStroke="#0b4d4a"
        />
      </Layer>
    </Stage>
  );
}

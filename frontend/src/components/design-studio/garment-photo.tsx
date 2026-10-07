"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { type Product, assetUrl, colorById, variantUrl } from "@/lib/catalog";
import { IMAGE_ASPECT, type Focus } from "./placement";

/**
 * Pan + zoom (transform-origin 0 0) that puts the focus point in the middle of the frame.
 * The photo box is as tall as the frame and centred in it, so everything works in fractions
 * of the photo box; the pan is clamped so the photo never slides off an edge.
 */
function focusTransform({ px, py, z }: Focus) {
  const A = IMAGE_ASPECT;

  let tx = 0.5 - z * px;

  // Photo edges relative to the frame:
  // left = (1 - A) / 2 + tx·A
  // right = left + z·A
  if (z * A >= 1) {
    tx = Math.min(
      -(1 - A) / (2 * A),
      Math.max((1 + A) / (2 * A) - z, tx)
    );
  } else {
    tx = (1 - z) / 2;
  }

  const ty = Math.min(
    0,
    Math.max(1 - z, 0.5 - z * py)
  );

  return `translate(${tx * 100}%, ${ty * 100}%) scale(${z})`;
}

/**
 * Alternate photographed angles.
 */
const poseKey = (pose: number) => `pose-${pose}`;

const isPoseKey = (key: string) => key.startsWith("pose-");

/**
 * Normalize colour IDs/names.
 */
function normalizeColor(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

/**
 * Images for every catalog product, grouped by product slug and colour.
 * Replace any local path with its ImageKit URL when the portrait is ready.
 * The original colour uses photo.jpg; other colours use prepared variants.
 */
const PRODUCT_COLOR_IMAGES: Record<string, Record<string, string>> = {
  // Essential Polo
  "polo-black": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/WhatsApp%20Image%202026-10-02%20at%2010.31.07.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/COTTSON%20White%20Polo%20Studio%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Navy%20Polo%20Studio%20Portrait.png",
    "red": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Burgundy%20Polo%20Studio%20Portrait.png",
    "forest": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Forest%20Green%20Polo%20Catalog%20Portrait.png",
    "navy-blue": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Navy%20Polo%20Studio%20Portrait.png",
    "burgundy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Burgundy%20Polo%20Studio%20Portrait.png",
    "burgandy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Burgundy%20Polo%20Studio%20Portrait.png",
    "forest-green": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Forest%20Green%20Polo%20Catalog%20Portrait.png",
  },
  // Classic Polo
  "classic-polo-black": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/WhatsApp%20Image%202026-10-02%20at%2010.31.07.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/COTTSON%20White%20Polo%20Studio%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Navy%20Polo%20Studio%20Portrait.png",
    "red": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Burgundy%20Polo%20Studio%20Portrait.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/COTTSON%20Gray%20Polo%20Portrait.png",
  },
  // Tipped Collar Polo
  "tipped-polo-charcoal": {
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Screenshot%202026-10-02%20122103.png",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Black%20Striped-Collar%20Polo%20Portrait.png",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/White%20Polo%20Studio%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Navy%20Striped-Collar%20Polo%20Portrait.png",
    "sky": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Sky%20Blue%20Striped-Collar%20Polo%20Portrait.png",
  },
  // Classic Polo — Navy
  "classic-polo-navy": {
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/COTTSON%20Navy%20Polo%20Studio%20Portrait.png",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/COTTSON%20Black%20Polo%20Portrait.png",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/COTTSON%20White%20Polo%20Studio%20Portrait_1leRuN0Pb.png",
    "sky": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/COTTSON%20Sky%20Blue%20Polo%20Portrait.png",
    "red": "https://ik.imagekit.io/qiap0iq38/COTTSON/Essential%20Polos/Red%20COTTSON%20Polo%20Studio%20Portrait%20(1).png",
  },
  // Relaxed Fit Polo
  "relaxed-polo-black": {
    "black": "/products/relaxed-polo-black/photo.jpg",
    "white": "/products/relaxed-polo-black/variants/white.webp",
    "navy": "/products/relaxed-polo-black/variants/navy.webp",
    "olive": "/products/relaxed-polo-black/variants/olive.webp",
    "beige": "/products/relaxed-polo-black/variants/beige.webp",
  },
  // Classic Crew Tee — Black
  "crew-tee-black": {
    "black": "/products/crew-tee-black/photo.jpg",
    "white": "/products/crew-tee-black/variants/white.webp",
    "navy": "/products/crew-tee-black/variants/navy.webp",
    "red": "/products/crew-tee-black/variants/red.webp",
    "grey": "/products/crew-tee-black/variants/grey.webp",
  },
  // Pinstripe Formal Shirt
  "pinstripe-shirt-blue": {
    "sky": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/WhatsApp%20Image%202026-10-02%20at%2012.33.44.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Pinstriped%20Shirt%20Catalog%20Portrait.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Striped%20Shirt%20and%20Beige%20Chinos%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Navy%20Pinstriped%20Shirt%20Studio%20Portrait.png",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Pinstriped%20Shirt%20and%20Khaki%20Trousers%20Portrait.png",
  },
  // Formal Shirt — Slate Grey
  "formal-shirt-slate": {
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/WhatsApp%20Image%202026-10-02%20at%2012.51.41.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Formal%20White%20Shirt%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Navy%20Shirt%20Studio%20Portrait.png",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Man%20in%20Black%20Shirt%20Studio%20Portrait.png",
    "maroon": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Maroon%20Shirt%20Studio%20Portrait.png",
  },
  // Formal Shirt — Sky Blue
  "formal-shirt-skyblue": {
    "sky": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Confident%20Man%20in%20Blue%20Dress%20Shirt.png",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Formal%20White%20Shirt%20Portrait.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/WhatsApp%20Image%202026-10-02%20at%2012.51.41.jpeg",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Navy%20Shirt%20Studio%20Portrait.png",
    "maroon": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Maroon%20Shirt%20Studio%20Portrait.png",
  },
  // Tipped Collar Polo — Sky Blue
  "tipped-polo-skyblue": {
    "sky": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/WhatsApp%20Image%202026-10-02%20at%2012.33.44.jpeg",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Striped%20Shirt%20and%20Beige%20Chinos%20Portrait.png",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Pinstriped%20Shirt%20and%20Khaki%20Trousers%20Portrait.png",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Pinstriped%20Shirt%20Catalog%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Stripped%20shirts/Navy%20Pinstriped%20Shirt%20Studio%20Portrait.png",
  },
  // Pullover Hoodie — White
  "pullover-hoodie-white": {
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Hoodies/WhatsApp%20Image%202026-10-02%20at%2014.24.24.jpeg",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Hoodies/Casual%20Black%20Hoodie%20Studio%20Portrait.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Hoodies/Minimal%20Studio%20Portrait%20in%20Grey%20Hoodie.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Hoodies/Navy%20Hoodie%20Studio%20Portrait.png",
  },
  // Zip Hoodie — Black
  "zip-hoodie-black": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/WhatsApp%20Image%202026-10-02%20at%2014.31.23.jpeg",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/COTTSON%20Gray%20Hoodie%20Studio%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/Navy%20COTTSON%20Hoodie%20Studio%20Portrait.png",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/COTTSON%20Hoodie%20Studio%20Portrait.png",
  },
  // Sleeveless Hoodie Vest
  "hoodie-vest-black": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/WhatsApp%20Image%202026-10-02%20at%2014.37.31.jpeg",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/Cottson%20Gray%20Zip%20Vest%20Catalog%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/Navy%20COTTSON%20Hoodie%20Vest%20Portrait.png",
    "olive": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/Olive%20Hooded%20Vest%20Studio%20Portrait.png",
  },
  // Track Jacket — Black
  "track-jacket-black": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/WhatsApp%20Image%202026-10-02%20at%2014.47.14.jpeg",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/Grey%20Zip-Up%20Jacket%20Catalog%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/Navy%20Zip%20Jacket%20Studio%20Portrait.png",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Jackets/Minimal%20COTTSON%20Jacket%20Catalog%20Portrait.png",
  },
  // Everyday Tipped Polo
  "drive": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Polo/WhatsApp%20Image%202026-10-02%20at%2014.52.09.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Polo/Minimalist%20COTTSON%20Polo%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Polo/Contemplative%20Studio%20Fashion%20Portrait.png",
    "red": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Polo/Seated%20Model%20in%20Red%20COTTSON%20Polo.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Polo/Casual%20Gray%20Polo%20Studio%20Portrait.png",
  },
  // Weekend Polo
  "ease": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/NO%20Tipped%20polos/WhatsApp%20Image%202026-10-02%20at%2015.00.37.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/NO%20Tipped%20polos/Young%20Man%20in%20White%20Polo%20Portrait.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/NO%20Tipped%20polos/Studio%20Portrait%20of%20Man%20in%20Navy%20Polo.png",
    "red": "https://ik.imagekit.io/qiap0iq38/COTTSON/NO%20Tipped%20polos/Young%20Man%20in%20Red%20Polo%20Portrait.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/NO%20Tipped%20polos/Light%20Gray%20Polo%20Studio%20Portrait.png",
  },
  // Formal Shirt — Classic Grey
  "grey-shirt": {
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/WhatsApp%20Image%202026-10-02%20at%2015.10.03.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Professional%20Portrait%20in%20White%20Shirt.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Navy%20Shirt%20Studio%20Portrait%20(1).png",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Professional%20Portrait%20in%20Black%20Shirt.png",
    "maroon": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Burgundy%20Shirt%20Studio%20Portrait.png",
  },
  // Formal Shirt — Butter Yellow
  "yellow-shirt": {
    "yellow": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/WhatsApp%20Image%202026-10-02%20at%2013.07.21.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Minimalist%20Studio%20Portrait%20of%20a%20Stylish%20Man.png",
    "sky": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Professional%20Portrait%20in%20Pale%20Blue%20and%20Black.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Calm%20Grey%20Shirt%20Studio%20Portrait.png",
  },
  // Contrast Tipped Polo — Red Trim
  "indus-01": {
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/WhatsApp%20Image%202026-10-02%20at%2015.17.05.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Young%20Man%20in%20Striped-Trim%20Polo.png",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Young%20Man%20in%20Navy%20COTTSON%20Polo.png",
    "red": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Red%20COTTSON%20Polo%20Studio%20Portrait.png",
  },
  // Contrast Tipped Polo — Green Trim
  "indus-04": {
    "yellow": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/WhatsApp%20Image%202026-10-02%20at%2015.23.38.jpeg",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/White%20Polo%20Fashion%20Portrait.png",
    "forest": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/COTTSON%20Green%20Polo%20Studio%20Portrait.png",
    "black": "https://ik.imagekit.io/qiap0iq38/COTTSON/Tipped%20Collar%20Polo/Black%20Polo%20Shirt%20Studio%20Portrait.png",
  },
  // Formal Shirt — Ice Blue
  "formal-shirt-ice-blue": {
    "sky": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Confident%20Man%20in%20Blue%20Dress%20Shirt.png",
    "white": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Formal%20White%20Shirt%20Portrait.png",
    "grey": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/WhatsApp%20Image%202026-10-02%20at%2012.51.41.jpeg",
    "navy": "https://ik.imagekit.io/qiap0iq38/COTTSON/Solid%20Formal%20Shirts/Navy%20Shirt%20Studio%20Portrait.png",
  },
  // Essential Polo
  "essential-polo": {
    "green": "/products/essential-polo/photo.jpg",
    "black": "/products/essential-polo/variants/black.webp",
    "navy": "/products/essential-polo/variants/navy.webp",
    "red": "/products/essential-polo/variants/red.webp",
    "white": "/products/essential-polo/variants/white.webp",
  },
};

/** Get the prepared image for the selected colour. */
export function imageForColor(product: Product, colorId: string) {
  const images = PRODUCT_COLOR_IMAGES[product.slug];
  const normalizedId = normalizeColor(colorId);
  const normalizedName = normalizeColor(colorById(colorId)?.name ?? colorId);

  return images?.[normalizedId] || images?.[normalizedName] || variantUrl(product, colorId);
}

/**
 * The polo photo.
 *
 * IMPORTANT:
 * The container, transform, aspect ratio and image positioning
 * remain exactly the same when changing colour.
 */
export const GarmentPhoto = forwardRef<
  HTMLDivElement,
  {
    product: Product;
    colorId: string;
    pose?: number;
    focus?: Focus | null;
    imageSrc?: string;
    children?: React.ReactNode;
  }
>(
  function GarmentPhoto(
    {
      product,
      colorId,
      pose = 0,
      focus,
      imageSrc,
      children,
    },
    ref
  ) {
    /**
     * For pose 0, ONLY the image source changes when colour changes.
     *
     * The frame itself never changes.
     */
    const selectedColorImage = imageForColor(
      product,
      colorId
    );

    /**
     * Use the image URL itself as the key.
     *
     * This guarantees that changing colour changes only
     * the image being displayed.
     */
    const key =
      pose === 0
        ? selectedColorImage
        : poseKey(pose);

    const [base, setBase] = useState(key);
    const [incoming, setIncoming] =
      useState<string | null>(null);
    const [swept, setSwept] = useState(false);

    /**
     * When the image changes, keep the exact same frame
     * and reveal the new image over the old one.
     */
    useEffect(() => {
      if (key === base) return;

      setIncoming(key);
      setSwept(false);
    }, [key, base]);

    useEffect(() => {
      if (!incoming) return;

      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setSwept(true)
        )
      );

      const t = window.setTimeout(() => {
        setBase(incoming);
        setIncoming(null);
        setSwept(false);
      }, 650);

      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }, [incoming]);

    /**
     * Render image.
     *
     * Every image uses:
     * - fill
     * - object-cover
     * - same parent container
     * - same transform
     * - same aspect ratio
     *
     * Therefore colour switching does NOT move the image frame.
     */
    const img = (k: string) => {
      const isPose = isPoseKey(k);

      const src = isPose
        ? assetUrl(
            product.slug,
            "model-photo.webp",
            Number(k.slice(5))
          )
        : k;

      const alt = isPose
        ? `${product.title} — alternate angle`
        : `${product.title} — ${colorById(colorId).name}`;

      return (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          draggable={false}
          className="pointer-events-none object-cover"
          priority
        />
      );
    };

    return (
      <div
        ref={ref}
        className="relative h-full select-none transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{
          /**
           * NEVER changes when colour changes.
           */
          aspectRatio: IMAGE_ASPECT,

          /**
           * NEVER changes when colour changes.
           */
          transformOrigin: "0 0",

          /**
           * The exact same focus/zoom/pan is preserved.
           */
          transform: focus
            ? focusTransform(focus)
            : undefined,
        }}
      >
        {/* Existing image */}
        {img(base)}

        {/* New colour image */}
        {incoming && (
          <div
            className="absolute inset-0 transition-[clip-path] duration-[650ms] ease-in-out"
            style={{
              /**
               * Same exact frame.
               * Only the new image is revealed.
               */
              clipPath: `inset(0 ${
                swept ? "0%" : "100%"
              } 0 0)`,
            }}
          >
            {img(incoming)}
          </div>
        )}

        {/* Sweep highlight */}
        {incoming && (
          <div
            className="pointer-events-none absolute inset-y-0 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent blur-md transition-[left] duration-[650ms] ease-in-out"
            style={{
              left: swept ? "100%" : "0%",
            }}
          />
        )}

        {children}
      </div>
    );
  }
);

/**
 * Average color of the garment photo around a point
 * (fractions of width/height).
 */
export function useFabricColor(
  src: string,
  fx: number,
  fy: number
) {
  const [color, setColor] = useState("#1a1a1a");

  const imgRef = useRef<{
    src: string;
    data: ImageData;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sample = (data: ImageData) => {
      const cx = Math.round(fx * data.width);
      const cy = Math.round(fy * data.height);

      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;

      for (let y = cy - 6; y <= cy + 6; y++) {
        for (let x = cx - 6; x <= cx + 6; x++) {
          if (
            x < 0 ||
            y < 0 ||
            x >= data.width ||
            y >= data.height
          ) {
            continue;
          }

          const i =
            (y * data.width + x) * 4;

          r += data.data[i];
          g += data.data[i + 1];
          b += data.data[i + 2];

          n++;
        }
      }

      if (n && !cancelled) {
        setColor(
          `rgb(${Math.round(r / n)},${Math.round(
            g / n
          )},${Math.round(b / n)})`
        );
      }
    };

    if (imgRef.current?.src === src) {
      sample(imgRef.current.data);
      return;
    }

    const img = new window.Image();

    img.onload = () => {
      const c = document.createElement("canvas");

      c.width = 200;
      c.height = Math.round(
        (200 * img.naturalHeight) /
          img.naturalWidth
      );

      const ctx = c.getContext("2d", {
        willReadFrequently: true,
      })!;

      ctx.drawImage(
        img,
        0,
        0,
        c.width,
        c.height
      );

      const data = ctx.getImageData(
        0,
        0,
        c.width,
        c.height
      );

      imgRef.current = {
        src,
        data,
      };

      sample(data);
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, fx, fy]);

  return color;
}

export type Weave =
  | "pique"
  | "poplin"
  | "jersey";

/**
 * The knit / weave to draw for a product in the close-up.
 */
export const weaveFor = (
  category: string
): Weave =>
  /shirt/i.test(category) &&
  !/t-?shirt|sweat/i.test(category)
    ? "poplin"
    : /polo/i.test(category)
      ? "pique"
      : "jersey";

/**
 * Surface texture per weave, lit from the top-left,
 * as CSS backgrounds.
 */
const WEAVES: Record<
  Weave,
  {
    image: string;
    size: string;
    position: string;
  }
> = {
  pique: {
    image:
      "radial-gradient(ellipse 45% 40% at 40% 38%, rgba(255,255,255,0.09), transparent 70%), radial-gradient(ellipse 45% 40% at 40% 38%, rgba(255,255,255,0.07), transparent 70%), linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px)",
    size: "6px 5px, 6px 5px, 3px 100%",
    position: "0 0, 3px 2.5px, 0 0",
  },

  poplin: {
    image:
      "linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.07) 1px, transparent 1px)",
    size: "3px 3px, 3px 3px",
    position: "0 0, 1px 1px",
  },

  jersey: {
    image:
      "linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px, rgba(255,255,255,0.06) 3px, transparent 4px), linear-gradient(0deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
    size: "5px 100%, 100% 4px",
    position: "0 0, 0 0",
  },
};

export type Stripes = {
  vertical: boolean;
  periodCm: number;
  light: boolean;
  duty: number;
};

/**
 * Macro shot of the logo on the fabric:
 * the garment's own colour with its weave
 * (and stripes, if it has them).
 */
export function FabricCloseup({
  fabric,
  logo,
  aspect,
  rotation,
  embroidered,
  weave = "pique",
  stripes,
  logoWidthCm,
}: {
  fabric: string;
  logo: string;
  aspect: number;
  rotation: number;
  embroidered: boolean;
  weave?: Weave;

  stripes?: Stripes | null;

  logoWidthCm?: number;
}) {
  // Fill most of the frame,
  // like a macro photo of the stitching.
  const w =
    aspect >= 1
      ? 88
      : 80 * aspect;

  const t = WEAVES[weave];

  /**
   * Stripe spacing as a share of the view.
   */
  const stripePct =
    stripes && logoWidthCm
      ? (stripes.periodCm /
          (logoWidthCm / (w / 100))) *
        100
      : null;

  /**
   * Photo's average colour mixes ground and stripes.
   */
  const line = stripes?.light
    ? "rgba(255,255,255,0.62)"
    : "rgba(0,0,0,0.35)";

  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background: fabric,
      }}
    >
      {stripes && stripePct && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: stripes.light
              ? "rgba(0,0,0,0.12)"
              : "rgba(255,255,255,0.1)",

            backgroundImage:
              `linear-gradient(${
                stripes.vertical
                  ? "90deg"
                  : "0deg"
              }, ${line} 0 ${
                stripes.duty * 100
              }%, transparent ${
                stripes.duty * 100
              }% 100%)`,

            backgroundSize:
              stripes.vertical
                ? `${stripePct}% 100%`
                : `100% ${stripePct}%`,
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: t.image,
          backgroundSize: t.size,
          backgroundPosition: t.position,
        }}
      />

      {/* Soft falloff like a real close-up photo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.35))]" />

      <div className="absolute inset-0 grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
        <img
          src={logo}
          alt="Logo close-up"
          draggable={false}
          className="pointer-events-none select-none"
          style={{
            width: `${w}%`,
            transform: `rotate(${rotation}deg)`,

            filter: embroidered
              ? "drop-shadow(1px 2px 2px rgba(0,0,0,0.45))"
              : "contrast(0.96) saturate(0.95)",

            opacity: embroidered
              ? 1
              : 0.9,
          }}
        />
      </div>
    </div>
  );
}

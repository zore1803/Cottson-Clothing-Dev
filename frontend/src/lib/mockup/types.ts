// Mannequin mockup system: one layered template per garment TYPE (public/mockups/<type>/),
// recoloured and composited in code. See public/mockups/README.md for the layer contract.

export type GarmentType =
  | "polo"
  | "tipped-polo"
  | "crew-tee"
  | "tipped-crew-tee"
  | "formal-shirt"
  | "pinstriped-shirt"
  | "solid-formal-shirt"
  | "hoodie"
  | "zip-hoodie"
  | "hoodie-vest"
  | "track-jacket";

/**
 * Recolourable parts. `body` is painted first and may cover the whole garment; the others are
 * painted over it in template.json order and should not overlap each other.
 */
export type RegionId = "body" | "sleeve" | "cuff" | "collar" | "collar-tip" | "sleeve-tip" | "placket" | "buttons" | "neckband" | "neck-tip" | "yoke" | "pocket";

export type LogoZoneId = "left-chest" | "center-chest" | "right-chest" | "left-sleeve-upper" | "left-sleeve" | "right-sleeve-upper" | "right-sleeve" | "back" | "back-neck" | "back-full";

/** A recolourable part of the garment, cut out by its mask */
export type TemplateRegion = {
  id: RegionId;
  label: string;
  /** Alpha mask PNG, relative to the template folder */
  mask: string;
  /** Hex colour used when neither the customisation nor `inherit` supplies one */
  default: string;
  /** Take this region's colour when it has none of its own (e.g. sleeve → body) */
  inherit?: RegionId;
};

/** Where a logo can go, in template pixels. The logo is fitted inside, keeping its aspect ratio. */
export type LogoZone = {
  id: LogoZoneId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, around the zone centre */
  rotation: number;
  /** Optional horizontal squeeze of the logo (sleeves: 0.88, as the sleeve curves away) */
  scaleX?: number;
  /** Omit when both finishes are supported. */
  finishes?: Finish[];
};

/** public/mockups/<type>/template.json */
export type TemplateConfig = {
  version: 2;
  type: GarmentType;
  /** Every layer PNG is exactly this size */
  width: number;
  height: number;
  /** Template pixels per real-world cm on the chest, to convert zones to cm for finishing limits */
  pxPerCm: number;
  /** Neutral fabric luminance in a dark reference photo (white templates use 255). */
  shadingScale?: number;
  /** Recolour the reference pixels instead of multiplying a white shading layer. */
  referenceColour?: string;
  referenceRendering?: "fabric";
  /** Circular details, such as buttons, that retain their original pixels. */
  preserveDetails?: { x: number; y: number; radius: number }[];
  layers: {
    /** The garment photographed/rendered in WHITE on a ghost mannequin, transparent background.
     * Its luminance is the shading for every colour. */
    base: string;
    /** Optional: labels, stitching etc. drawn on top, never recoloured */
    details?: string;
  };
  /** 0–1: strength of the soft-light pass that keeps folds visible on dark colours (default 0.55) */
  foldStrength?: number;
  /**
   * How the region masks relate. "layered" (default): body covers the whole garment and the other
   * parts are painted over it. "partition": soft-edged masks that each own their pixels and SUM
   * to the garment alpha; they must be added together, not stacked, or the background shows
   * through along every boundary (see renderMockup).
   */
  masks?: "layered" | "partition";
  regions: TemplateRegion[];
  zones: LogoZone[];
};

/** Colour per region (hex). Missing regions fall back to `inherit`, then the template default. */
export type RegionColours = Partial<Record<RegionId, string>>;

export type Finish = "embroidery" | "print";

export type LogoPlacement = {
  /** Image URL or data URL of the uploaded logo */
  src: string;
  zone: LogoZoneId;
  /** 0.5–1: fraction of the zone the fitted logo fills */
  scale: number;
  finish: Finish;
  /** Upper-sleeve zones: "along" the sleeve (the zone as defined) or "upright" (turned 90°) */
  orientation?: LogoOrientation;
};

export type LogoOrientation = "along" | "upright";

export type MockupState = {
  colours: RegionColours;
  logo?: LogoPlacement | null;
};

/** data/productMockups.json entry */
export type ProductMockup = {
  template: GarmentType;
  /** Colour ids from data/colors.json (garment list for body/sleeve/collar, trim list for tips) */
  colours: Partial<Record<RegionId, string>>;
};

// Writes the template.json files for the polo mannequin views (public/mockups/mannequin/<view>/)
// and the family manifest (public/mockups/mannequin/family.json). Pure data: it reads no images.
//
//   node scripts/write-mannequin-templates.mjs
//
// Zone positions come from the brief as CENTRE + box size; they are stored in the existing zone
// schema (top-left x/y + w/h), like the ghost templates. All zones and pxPerCm are PROVISIONAL.
import fs from "node:fs";

const DIR = "public/mockups/mannequin";
const WHITE = "#f5f5f2";

const PX_PER_CM = 11.6;
const PX_PER_CM_NOTE =
  "PROVISIONAL assumption: size M, 40 in chest = 50.8 cm flat = 590 px armpit to armpit on the front view";

// Brochure print limits, converted exactly (inches x 2.54)
const IN = (w, h) => ({ w: +(w * 2.54).toFixed(2), h: +(h * 2.54).toFixed(2) });
const SMALL = IN(4, 2); // 10.16 x 5.08 cm
const STRIP = IN(5, 1); // 12.70 x 2.54 cm
const LARGE = IN(7, 8); // 17.78 x 20.32 cm

const zone = (id, label, cx, cy, w, h, maxCm, target, avoid) => ({
  id,
  label,
  x: cx - w / 2,
  y: cy - h / 2,
  w,
  h,
  rotation: 0,
  maxCm,
  target,
  avoid,
});

const REGION = {
  body: { id: "body", label: "Body", mask: "mask-body.png", default: WHITE },
  yoke: { id: "yoke", label: "Back yoke", mask: "mask-yoke.png", default: WHITE, inherit: "body" },
  pocket: { id: "pocket", label: "Pocket", mask: "mask-pocket.png", default: WHITE, inherit: "body", when: { pocket: true } },
  sleeve: { id: "sleeve", label: "Sleeves", mask: "mask-sleeve.png", default: WHITE, inherit: "body" },
  cuff: { id: "cuff", label: "Sleeve cuffs", mask: "mask-cuff.png", default: WHITE, inherit: "sleeve" },
  collar: { id: "collar", label: "Collar", mask: "mask-collar.png", default: WHITE, inherit: "body" },
  placket: { id: "placket", label: "Placket", mask: "mask-placket.png", default: WHITE, inherit: "body" },
  // Buttons are white by default, independent of the body colour
  buttons: { id: "buttons", label: "Buttons", mask: "mask-buttons.png", default: WHITE },
};
const TRIMS = { single: "mask-trim-single.png", doubleA: "mask-trim-double-a.png", doubleB: "mask-trim-double-b.png" };

const base = (id, view, extra) => ({
  version: 2,
  style: "mannequin",
  family: "polo",
  id,
  view,
  width: 1200,
  height: 1600,
  groundShadow: false,
  // Grow part masks 1 px inside the body at load time: removes a 1 px rim of body colour around
  // contrast-coloured parts (the body mask is slightly larger than the parts). Assets unchanged.
  dilateParts: true,
  pxPerCm: PX_PER_CM,
  pxPerCmNote: PX_PER_CM_NOTE,
  layers: { base: "base.png", mannequin: "mannequin.png" },
  // Shading: base.png R channel / scale = multiplier S (200 = flat fabric)
  // Contrast shading (gainBase/gainDark) + seeded fabric grain; see core shadeColourContrast.
  // Grain above ~0.045 + 0.03 reads as digital noise.
  shading: {
    scale: 200,
    foldStrength: 0.55,
    gainBase: 1.2,
    gainDark: 1.4,
    grain: { amp: 0.018, ampDark: 0.014, sigma: 0.5, seed: 1337 },
  },
  trims: TRIMS,
  details: [],
  ...extra,
});

const chestAvoid = (buttons) => ["placket", "collar", ...(buttons ? ["buttons"] : [])];
const chestZones = (buttons) => [
  zone("left-chest", "Left chest", 770, 536, 118, 59, SMALL, "body", chestAvoid(buttons)),
  zone("center-chest", "Center chest", 600, 650, 118, 59, SMALL, "body", chestAvoid(buttons)),
  zone("right-chest", "Right chest", 430, 536, 118, 59, SMALL, "body", chestAvoid(buttons)),
];
const sideZones = [zone("left-sleeve", "Left sleeve", 658, 590, 118, 59, SMALL, "sleeve", ["cuff", "collar"])];

const templates = {
  "polo-front": base("polo-front", "front", {
    closure: "buttons",
    variants: { pocket: { base: "base-pocket.png" } },
    regions: [REGION.body, REGION.pocket, REGION.sleeve, REGION.cuff, REGION.collar, REGION.placket, REGION.buttons],
    zones: chestZones(true),
  }),
  "polo-front-zip": base("polo-front-zip", "front", {
    closure: "zip",
    variants: { pocket: { base: "base-pocket.png" } },
    regions: [REGION.body, REGION.pocket, REGION.sleeve, REGION.cuff, REGION.collar, { ...REGION.placket, label: "Zip tape" }],
    details: [{ file: "details-zipper.png" }],
    zones: chestZones(false),
  }),
  "polo-back": base("polo-back", "back", {
    regions: [REGION.body, REGION.yoke, REGION.sleeve, REGION.cuff, REGION.collar],
    zones: [
      zone("back-neck", "Back neck", 600, 276, 147, 29, STRIP, "body", ["collar"]),
      zone("back-full", "Full back", 600, 560, 206, 236, LARGE, "body", ["collar", "yoke", "sleeve"]),
    ],
  }),
  "polo-side": base("polo-side", "side-left", {
    regions: [REGION.body, REGION.sleeve, REGION.cuff, REGION.collar],
    zones: sideZones,
  }),
  "polo-side-noarm": base("polo-side-noarm", "side-left", {
    regions: [REGION.body, REGION.sleeve, REGION.cuff, REGION.collar],
    zones: sideZones,
  }),
};

for (const [folder, t] of Object.entries(templates)) {
  fs.writeFileSync(`${DIR}/${folder}/template.json`, JSON.stringify(t, null, 2) + "\n");
  console.log(`wrote ${DIR}/${folder}/template.json`);
}

// Which folder each view / option combination uses (see src/lib/mockup/mannequin.ts resolveView)
const family = {
  version: 1,
  family: "polo",
  style: "mannequin",
  views: {
    front: { buttons: "polo-front", zip: "polo-front-zip" },
    back: "polo-back",
    "side-left": { noArm: "polo-side-noarm", arm: "polo-side" },
    // Virtual view: side-left flipped horizontally at load time (zone x' = width - x, rotation negated)
    "side-right": { mirrorOf: "side-left" },
  },
  // false: side views use polo-side-noarm (default); true: polo-side (mannequin arm visible)
  sideShowsArm: false,
  // Mirrored zones for the virtual side-right view: id -> source zone id in side-left
  mirroredZones: { "right-sleeve": { from: "left-sleeve", label: "Right sleeve" } },
  // Price add-ons per option, in INR per piece (hooks; all 0 for now)
  prices: {
    closure: { buttons: 0, zip: 0 },
    pocket: { no: 0, yes: 0 },
    trimStyle: { none: 0, single: 0, double: 0 },
  },
};
fs.writeFileSync(`${DIR}/family.json`, JSON.stringify(family, null, 2) + "\n");
console.log(`wrote ${DIR}/family.json`);

// Per-category accent colours for the products page. All are dark enough for 11px labels on white
// (about 4.5:1 or better); the pink is the site's existing accent (#c8426b).
const ACCENTS: Record<string, string> = {
  Polos: "#1B7A57",
  Shirts: "#0F7C8A",
  "T-Shirts": "#C8426B",
  Jacket: "#6B4FA3",
  Hoodies: "#9A6212",
  Sweatshirt: "#8E3A62",
  Towels: "#2F6FA3",
  Cap: "#B8512C",
  Trousers: "#5B6B7A",
};

export const DEFAULT_ACCENT = "#1F5A8C";
export const categoryAccent = (category?: string | null) => (category && ACCENTS[category]) || DEFAULT_ACCENT;

// Soft category tints, mixed with white so they stay pale behind photos and headers
export const categoryWash = (category?: string | null) => `color-mix(in srgb, ${categoryAccent(category)} 8%, #fff)`;
export const categoryGlow = (category?: string | null) => `color-mix(in srgb, ${categoryAccent(category)} 15%, #fff)`;

// One hue per filter type: production time (teal), quantity (amber), product type (violet)
export const FILTER_TONES = {
  days: { icon: "text-[#0F7C8A]", chip: "bg-[#DDF0EE] text-[#0B5F6B] hover:bg-[#CBE7E4]" },
  qty: { icon: "text-[#B7791F]", chip: "bg-[#FBEBD0] text-[#7A4E0C] hover:bg-[#F6DDB4]" },
  flags: { icon: "text-[#6B4FA3]", chip: "bg-[#E9E2F5] text-[#4F3A85] hover:bg-[#DCD1EE]" },
} as const;

// Production-time badge: green for quick turnaround, blue otherwise
export const daysBadge = (days: number) => (days <= 14 ? "bg-[#E1F3EA] text-[#16644A]" : "bg-[#E4EEF8] text-[#1F5A8C]");
export const UNITS_BADGE = "bg-[#FBF0DC] text-[#7A4E0C]";

// Product detail page theme: set once on a wrapper, read by the page's components as
// var(--pa), var(--pa-wash) (pale panel), var(--pa-deep) (hover) and var(--pa-line) (borders)
export const productTheme = (category?: string | null) => {
  const a = categoryAccent(category);
  return {
    "--pa": a,
    "--pa-wash": `color-mix(in srgb, ${a} 7%, #fff)`,
    "--pa-glow": `color-mix(in srgb, ${a} 14%, #fff)`,
    "--pa-deep": `color-mix(in srgb, ${a} 78%, #000)`,
    "--pa-line": `color-mix(in srgb, ${a} 20%, #fff)`,
  } as import("react").CSSProperties;
};

// Per-category accent colours for the products page. All are dark enough for 11px labels on white
// (about 4.5:1 or better); the pink is the site's existing accent (#c8426b).
const ACCENTS: Record<string, string> = {
  Polos: "#1F5A8C",
  Shirts: "#0F7C8A",
  "T-Shirts": "#C8426B",
  Jacket: "#6B4FA3",
  Hoodies: "#9A6212",
  Sweatshirt: "#23795E",
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

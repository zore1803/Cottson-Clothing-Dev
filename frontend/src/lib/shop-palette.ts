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

// Color contrast between thread (or ink) and fabric, using the WCAG definitions.

/** "#rrggbb" or "rgb(r, g, b)" -> [r, g, b] in 0..255 */
export function parseColor(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const [r = 0, g = 0, b = 0] = (c.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return [r, g, b];
}

/** WCAG relative luminance, 0 (black) .. 1 (white) */
export function relativeLuminance(c: string) {
  const [r, g, b] = parseColor(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 (none) .. 21 (black on white) */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

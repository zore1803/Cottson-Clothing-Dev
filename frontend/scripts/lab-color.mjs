// sRGB <-> CIE Lab (D65 white point) conversion, shared by the recolor pipeline.
// Lab separates brightness (L) from color (a/b), so swapping only a/b onto a garment's own
// per-pixel L keeps every fold, shadow and fabric-texture highlight exactly as photographed.

const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const linearToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

const fwd = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const inv = (t) => (t > 6 / 29 ? t * t * t : 3 * (6 / 29) ** 2 * (t - 4 / 29));

// D65 reference white
const Xn = 0.95047, Yn = 1, Zn = 1.08883;

export function rgbToLab(r, g, b) {
  const R = srgbToLinear(r / 255), G = srgbToLinear(g / 255), B = srgbToLinear(b / 255);
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / Xn;
  const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / Yn;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / Zn;
  const fx = fwd(X), fy = fwd(Y), fz = fwd(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb(L, a, b) {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const X = inv(fx) * Xn, Y = inv(fy) * Yn, Z = inv(fz) * Zn;
  const R = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const G = X * -0.969266 + Y * 1.8760108 + Z * 0.041556;
  const B = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;
  const clamp = (v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255);
  return [clamp(R), clamp(G), clamp(B)];
}

export const hexToLab = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return rgbToLab(r, g, b);
};

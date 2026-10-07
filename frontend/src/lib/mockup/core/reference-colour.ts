/** Recolour around the reference fabric tone, preserving shadows and highlight detail. */
export function recolourReferenceChannel(source: number, reference: number, target: number) {
  if (target === reference) return source;
  return Math.round(Math.max(0, Math.min(255, source <= reference
    ? target * source / Math.max(1, reference)
    : target + (255 - target) * (source - reference) / Math.max(1, 255 - reference))));
}

/** Preserve shared fabric luminance without independently distorting RGB channels. */
export function recolourReferencePixel(source: number[], reference: number[], target: number[]) {
  if (target.every((value, i) => value === reference[i])) return source.slice();
  const luminance = (rgb: number[]) => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const delta = luminance(source) - luminance(reference);
  // Reserve highlight headroom on pale fabrics so fine stripes remain visible.
  const headroom = 1 - 0.12 * Math.max(...target) / 255;
  return target.map((channel) => Math.round(Math.max(0, Math.min(255, channel * headroom + delta))));
}

/** Reproduce fabric illumination in linear light. */
export function recolourFabricPixel(source: number[], reference: number[], target: number[]) {
  if (target.every((value, i) => value === reference[i])) return source.slice();
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (rgb: number[]) => linear(rgb[0]) * 0.2126 + linear(rgb[1]) * 0.7152 + linear(rgb[2]) * 0.0722;
  const shading = Math.max(0.08, Math.min(2.4, (luminance(source) / Math.max(0.001, luminance(reference))) ** 0.65));
  const isWhite = Math.min(...target) >= 225 && Math.max(...target) - Math.min(...target) <= 16;
  return target.map((channel) => {
    if (isWhite) {
      // White fleece scatters light into folds. Compress the black reference's
      // shadows rather than transferring its dark-dye contrast directly.
      const diffuse = 0.32 + 0.68 * shading ** 0.45;
      let value = linear(channel) * 0.92 * diffuse;
      if (value > 0.8) value = 0.8 + 0.2 * (1 - Math.exp(-(value - 0.8) / 0.2));
      return Math.round(Math.max(0, Math.min(255, (1.055 * value ** (1 / 2.4) - 0.055) * 255)));
    }
    // Dye reflects the source lighting multiplicatively; highlights have a soft shoulder.
    let value = linear(channel) * 0.82 * shading + Math.max(0, shading - 1) * 0.012;
    if (value > 0.7) value = 0.7 + 0.3 * (1 - Math.exp(-(value - 0.7) / 0.3));
    const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(255, encoded * 255)));
  });
}

export function buttonProtection(distance: number, radius: number, luminance: number, fabricThreshold = 65) {
  const edge = Math.max(0, Math.min(1, (radius - distance) / 3));
  const detail = Math.max(0, Math.min(1, (luminance - fabricThreshold) / 35));
  return edge * detail;
}

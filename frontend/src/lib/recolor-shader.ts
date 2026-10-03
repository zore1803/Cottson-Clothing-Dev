// GLSL for the PixiJS live recolor mesh.
// The garment mask is pre-isolated (offline) into a feathered-alpha "garment-layer" PNG,
// pixel-aligned with the untouched product photo (uBase). Only pixels under that mask are
// touched here; alpha 0 lets the original photo show through unmodified outside the garment.

export const RECOLOR_VERTEX = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}`;

// Lab color-swap: convert the source pixel to CIE Lab and replace a*/b* (color) with the
// target's — the same trick as Photoshop's "Color" blend mode, so folds, shadows and fabric
// texture come straight from the photo's own shading; only hue/saturation change. L
// (lightness) is re-centered on the target color's own L, keeping each pixel's shading
// relative to the garment's average L, so a black target actually renders black and a white
// target actually renders white instead of staying pinned to the source photo's own
// brightness. Matches scripts/lab-color.mjs used offline to pre-render the listing
// thumbnails, so the live canvas and the cached variants agree.
export const RECOLOR_FRAGMENT = /* glsl */ `
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uBase;
uniform sampler2D uGarment;
uniform vec3 uTargetLab; // target color's Lab L*, a*, b*
uniform float uSourceAvgL; // this garment's own average Lab L, sampled offline in JS

float srgbToLinear(float v) { return v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4); }
float linearToSrgb(float v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * pow(v, 1.0 / 2.4) - 0.055; }
float fwdLab(float t) { return t > 216.0 / 24389.0 ? pow(t, 1.0 / 3.0) : (24389.0 / 27.0 * t + 16.0) / 116.0; }
float invLab(float t) { return t > 6.0 / 29.0 ? t * t * t : 3.0 * pow(6.0 / 29.0, 2.0) * (t - 4.0 / 29.0); }

const vec3 D65 = vec3(0.95047, 1.0, 1.08883);

float rgbToLabL(vec3 c) {
  vec3 lin = vec3(srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b));
  float Y = (lin.r * 0.2126729 + lin.g * 0.7151522 + lin.b * 0.072175) / D65.y;
  return 116.0 * fwdLab(Y) - 16.0;
}

vec3 labToRgb(float L, float a, float b) {
  float fy = (L + 16.0) / 116.0;
  float fx = fy + a / 500.0;
  float fz = fy - b / 200.0;
  vec3 xyz = vec3(invLab(fx) * D65.x, invLab(fy) * D65.y, invLab(fz) * D65.z);
  vec3 lin = vec3(
    dot(xyz, vec3(3.2404542, -1.5371385, -0.4985314)),
    dot(xyz, vec3(-0.969266, 1.8760108, 0.041556)),
    dot(xyz, vec3(0.0556434, -0.2040259, 1.0572252))
  );
  lin = clamp(lin, 0.0, 1.0);
  return vec3(linearToSrgb(lin.r), linearToSrgb(lin.g), linearToSrgb(lin.b));
}

void main() {
  float mask = texture(uGarment, vUV).a;
  if (mask <= 0.0001) {
    finalColor = vec4(0.0);
    return;
  }
  vec3 src = texture(uBase, vUV).rgb;
  float L = rgbToLabL(src);
  float newL = clamp(uTargetLab.x + (L - uSourceAvgL), 0.0, 100.0);
  vec3 recolored = labToRgb(newL, uTargetLab.y, uTargetLab.z);
  finalColor = vec4(recolored * mask, mask);
}`;

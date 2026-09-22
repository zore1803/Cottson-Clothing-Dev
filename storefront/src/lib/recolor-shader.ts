// GLSL for the PixiJS recolor mesh.
// Inputs: the product photo, and the prepared mask (R = top, G = logo/print, B = trousers).
// For each garment: shading = pixel brightness relative to that garment's median brightness
// (keeps folds, seams, texture), multiplied into the chosen color. Logos are never touched.
// Kept in sync with scripts/render-variants.mjs, which pre-renders catalog colors.

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

export const RECOLOR_FRAGMENT = /* glsl */ `
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uPhoto;
uniform sampler2D uMask;
uniform vec3 uTopColor;
uniform vec3 uPantsColor;
uniform vec4 uTopStats;    // median luminance, shading exponent, highlight peak, dark-fabric flag
uniform vec4 uPantsStats;
uniform vec2 uOn;          // x = recolor top, y = recolor trousers
uniform vec2 uTexel;       // 1 / image size

vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Very dark fabric carries mostly camera grain, so its shading is read from a blurred neighbourhood
float smoothLum(vec2 uv) {
  float s = 0.0;
  for (int y = -2; y <= 2; y++)
    for (int x = -2; x <= 2; x++)
      s += lum(toLin(texture(uPhoto, uv + vec2(float(x), float(y)) * uTexel * 1.5).rgb));
  return s / 25.0;
}

vec3 recolor(vec3 target, vec4 stats, float L, float Ls) {
  vec3 T = max(toLin(target), vec3(0.006));
  float head = min(1.0, 0.98 / (max(max(T.r, T.g), T.b) * stats.z));
  head = head + (1.0 - head) * 0.6;                       // headroom so highlights don't clip
  float darkT = 1.0 - smoothstep(0.02, 0.25, lum(T));     // dark colors get a soft sheen on folds
  float l = stats.w > 0.5 ? Ls : L;
  float s = min(pow(l / max(stats.x, 1e-4), stats.y), 4.0);
  vec3 c = T * head * s + darkT * (max(s - 1.0, 0.0) * 0.035 + 0.004 * s);
  return c / (1.0 + max(c - 0.9, 0.0));                   // soft highlight roll-off
}

void main() {
  vec3 src = texture(uPhoto, vUV).rgb;
  vec3 m = texture(uMask, vUV).rgb;
  vec3 lin = toLin(src);
  float wTop = m.r * uOn.x * (1.0 - m.g);
  float wPants = m.b * uOn.y;
  vec3 outc = lin;
  if (wTop + wPants > 0.002) {
    float L = lum(lin);
    bool needSmooth = (wTop > 0.0 && uTopStats.w > 0.5) || (wPants > 0.0 && uPantsStats.w > 0.5);
    float Ls = needSmooth ? smoothLum(vUV) : L;
    outc = mix(outc, recolor(uTopColor, uTopStats, L, Ls), wTop);
    outc = mix(outc, recolor(uPantsColor, uPantsStats, L, Ls), wPants);
  }
  finalColor = vec4(toSrgb(clamp(outc, 0.0, 1.0)), 1.0);
}`;

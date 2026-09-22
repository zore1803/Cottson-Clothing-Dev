// GLSL for the PixiJS live recolor mesh.
// The garment is pre-isolated (offline) into its own grayscale+alpha "garment-layer" PNG,
// stacked pixel-aligned on top of the untouched product photo. Only this layer is drawn
// here; alpha 0 lets the original photo show through unmodified outside the garment.

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

// Overlay blend: keeps shadow/highlight detail visible even on very dark or very light
// target colors (black doesn't crush to a flat block, white doesn't blow out to it).
export const RECOLOR_FRAGMENT = /* glsl */ `
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uGarment;
uniform vec3 uColor;

void main() {
  vec4 px = texture(uGarment, vUV);
  if (px.a <= 0.0001) {
    finalColor = vec4(0.0);
    return;
  }
  float g = px.r / px.a; // un-premultiply grayscale shading (r == g == b)
  // compress the shading range so neither black nor white targets clip to pure 0/1 —
  // keeps soft, believable shadow depth at both ends instead of crushing to near-black
  // blotches (white) or a flat block (black)
  g = mix(0.22, 0.88, g);
  vec3 low = 2.0 * uColor * g;
  vec3 high = 1.0 - 2.0 * (1.0 - uColor) * (1.0 - g);
  vec3 blended = clamp(mix(low, high, vec3(step(0.5, g))), 0.0, 1.0);
  finalColor = vec4(blended * px.a, px.a);
}`;

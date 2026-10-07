import { test } from "node:test";
import assert from "node:assert/strict";
import { recolourReferenceChannel, recolourReferencePixel, recolourFabricPixel, buttonProtection } from "../src/lib/mockup/core/reference-colour.ts";

test("fabric lighting keeps fold contrast on navy and white without clipping highlights", () => {
  for (const target of [[31, 42, 68], [245, 245, 242]]) {
    const shadow = recolourFabricPixel([16, 16, 16], [28, 28, 28], target);
    const mid = recolourFabricPixel([28, 28, 28], [28, 28, 28], target);
    const light = recolourFabricPixel([45, 45, 45], [28, 28, 28], target);
    for (let c = 0; c < 3; c++) {
      assert.ok(shadow[c] < mid[c] && mid[c] < light[c]);
      assert.ok(light[c] < 255);
    }
  }
  assert.deepEqual(recolourFabricPixel([20, 25, 30], [28, 28, 28], [28, 28, 28]), [20, 25, 30]);
});

test("white fleece has softer fold shadows while other dye colours stay unchanged", () => {
  const shades = [16, 28, 45];
  const render = (target) => shades.map((s) => recolourFabricPixel([s, s, s], [28, 28, 28], target));
  assert.deepEqual(render([31, 42, 68]), [[19, 27, 47], [27, 38, 61], [46, 57, 84]]);
  assert.deepEqual(render([140, 30, 45]), [[100, 19, 30], [128, 27, 40], [164, 45, 60]]);
  const white = render([245, 245, 242]);
  assert.ok(white[0][0] > 210);
  assert.ok(white[1][0] > white[0][0]);
  assert.ok(white[2][0] > white[1][0] && white[2][0] < 255);
});

test("pixel recolouring keeps the original RGB at the reference colour", () => {
  assert.deepEqual(recolourReferencePixel([30, 34, 39], [36, 36, 36], [36, 36, 36]), [30, 34, 39]);
});
test("pale fabric keeps visible pinstripe detail instead of clipping both tones to white", () => {
  const dark = recolourReferencePixel([32, 32, 32], [36, 36, 36], [245, 245, 245]);
  const stripe = recolourReferencePixel([48, 48, 48], [36, 36, 36], [245, 245, 245]);
  assert.ok(stripe[0] - dark[0] >= 12);
  assert.ok(stripe[0] < 255);
});
test("button protection excludes dark surrounding fabric and fades at the boundary", () => {
  assert.equal(buttonProtection(0, 13, 40), 0);
  assert.equal(buttonProtection(0, 13, 160), 1);
  assert.equal(buttonProtection(13, 13, 160), 0);
  assert.ok(buttonProtection(12, 13, 160) < 0.5);
});

test("the reference colour reproduces every original pixel exactly", () => {
  for (let pixel = 0; pixel < 256; pixel++) assert.equal(recolourReferenceChannel(pixel, 36, 36), pixel);
});
test("recolouring preserves ordered fold and pinstripe contrast for light and dark fabric", () => {
  for (const target of [20, 80, 160, 240]) {
    const values = [0, 15, 36, 55, 100, 255].map((pixel) => recolourReferenceChannel(pixel, 36, target));
    assert.equal(values[2], target);
    assert.equal(values[0], 0);
    assert.equal(values.at(-1), 255);
    for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1]);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readProductColors, normalizeColorImages, resolveColorPhoto } from "../src/lib/product-colors.ts";

const available = [{ id: "black", name: "Black" }, { id: "white", name: "White" }];
test("superadmin form photos resolve to matching preview colours after database serialization", () => {
  const saved = readProductColors(validData(), available);
  const photos = JSON.parse(JSON.stringify(normalizeColorImages(new Map(Object.entries(saved.colorImages)))));
  assert.equal(resolveColorPhoto("black", "Black", photos), saved.colorImages.black);
  assert.equal(resolveColorPhoto("white", "White", photos), saved.colorImages.white);
  assert.equal(resolveColorPhoto("white", "White", photos, { white: "old.jpg" }), saved.colorImages.white);
  assert.equal(resolveColorPhoto("navy-blue", "Navy Blue", { " Navy_Blue ": " navy.jpg " }), "navy.jpg");
  assert.equal(resolveColorPhoto("red", "Red", photos), undefined);
});
test("MongoDB maps and lean objects preserve colour URLs for client previews", () => {
  const expected = { black: "https://ik.imagekit.io/qiap0iq38/black.jpg", white: "https://ik.imagekit.io/qiap0iq38/white.jpg" };
  for (const value of [expected, new Map(Object.entries(expected))]) {
    const images = JSON.parse(JSON.stringify(normalizeColorImages(value)));
    assert.deepEqual(images, expected);
    assert.notEqual(images.black, images.white);
  }
  assert.deepEqual(normalizeColorImages(undefined), {});
});
function validData() {
  const data = new FormData();
  data.append("colors", "black");
  data.append("colors", "white");
  data.set("originalColor", "white");
  data.set("image-black", "https://ik.imagekit.io/qiap0iq38/black.jpg");
  data.set("image-white", "https://ik.imagekit.io/qiap0iq38/white.jpg");
  return data;
}
test("preserves distinct photos and selected default colour", () => {
  const result = readProductColors(validData(), available);
  assert.deepEqual(result.colors, ["black", "white"]);
  assert.equal(result.originalColor, "white");
  assert.equal(result.colorImages.black, "https://ik.imagekit.io/qiap0iq38/black.jpg");
  assert.equal(result.colorImages.white, "https://ik.imagekit.io/qiap0iq38/white.jpg");
});
test("requires a photo for every colour", () => {
  const data = validData();
  data.delete("image-white");
  assert.throws(() => readProductColors(data, available), /photo URL for White/);
});
test("rejects unknown colours, empty selections and unavailable defaults", () => {
  for (const change of [(d) => d.append("colors", "__proto__"), (d) => d.delete("colors"), (d) => d.set("originalColor", "navy")]) {
    const data = validData();
    change(data);
    assert.throws(() => readProductColors(data, available), /available colours/);
  }
});
test("rejects unsafe image URLs and another ImageKit account", () => {
  for (const url of ["javascript:alert(1)", "http://ik.imagekit.io/qiap0iq38/photo.jpg", "https://example.com/photo.jpg", "https://ik.imagekit.io/another-account/photo.jpg", "https://user:password@ik.imagekit.io/qiap0iq38/photo.jpg"]) {
    const data = validData();
    data.set("image-white", url);
    assert.throws(() => readProductColors(data, available), /photo URL for White/);
  }
});
test("ignores unselected photos and deduplicates colours", () => {
  const data = validData();
  data.append("colors", "black");
  data.set("image-navy", "https://example.com/ignored.jpg");
  assert.deepEqual(Object.keys(readProductColors(data, available).colorImages), ["black", "white"]);
});

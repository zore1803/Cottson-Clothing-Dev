import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fitLogo, logoSizeCm, placedZone } from "../src/lib/mockup/zones.ts";

for (const type of ["track-jacket", "zip-hoodie", "hoodie-vest", "solid-formal-shirt", "pinstriped-shirt", "hoodie"]) {
  test(`${type}: tall and wide logos remain inside each placement at every size`, async () => {
    const config = JSON.parse(await readFile(new URL(`../public/mockups/${type}/template.json`, import.meta.url), "utf8"));
    for (const raw of config.zones) {
      const zone = placedZone(config, raw.id);
      assert.ok(Number.isFinite(zone.rotation));
      for (const [w, h] of [[1200, 200], [200, 1200], [400, 400]]) {
        for (const scale of [0.5, 0.6, 1]) {
          const fit = fitLogo(zone, w, h, scale);
          assert.ok(fit.w <= zone.w + 0.001 && fit.h <= zone.h + 0.001);
          assert.equal(fit.cx, zone.x + zone.w / 2);
          assert.equal(fit.cy, zone.y + zone.h / 2);
          const cm = logoSizeCm(config, zone, w, h, scale);
          assert.ok(cm.w > 0 && cm.h > 0);
          assert.ok(Math.abs(cm.w / cm.h - w / h) < 0.001);
        }
      }
    }
  });
}

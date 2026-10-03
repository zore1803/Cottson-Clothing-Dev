// Place the sleeve logo zones from mask-sleeve (not by eye):
//   node scripts/fit-sleeve-zones.mjs polo tipped-polo
//
// Per sleeve, the axis is the principal direction of the sleeve mask, from the shoulder seam
// (top end) to the hem. Two zones each:
//
// Mid sleeve  (left-sleeve / right-sleeve): the point 62% along the axis, centred on the mask's
//   cross-section there; square box of 48% of that width, rotated to the axis; moved toward
//   the shoulder until it's 12 px clear of the cuff / sleeve-tip masks. scaleX 0.88.
//
// Upper sleeve (…-sleeve-upper): the point 35% along the axis, centred on the cross-section
//   and shifted 10% of its width toward the outer edge; a 2:1 box with its long side along the
//   sleeve (rotation = axis angle + 90°): the largest-area rectangle that stays ≥95% on the
//   mask with a 12 px edge margin and 12 px clear of the cuff / tipping, long side capped at
//   60% of the shoulder-to-cuff length. Warns when the long side is under 6 cm. scaleX 1.
import sharp from "sharp";
import fs from "node:fs";

const CLEAR = 12;
const MID = { along: 0.62, box: 0.48, scaleX: 0.88 };
const UPPER = { along: 0.35, outward: 0.1, maxLength: 0.6, inside: 0.95, minCm: 6 };

const alpha = async (f) => {
  const img = sharp(f).ensureAlpha();
  const { width, height } = await img.metadata();
  return { W: width, H: height, a: await img.extractChannel(3).raw().toBuffer() };
};
const r1 = (v) => Math.round(v * 10) / 10;

for (const type of process.argv.slice(2)) {
  const dir = `public/mockups/${type}`;
  const cfg = JSON.parse(fs.readFileSync(`${dir}/template.json`, "utf8"));
  const { W, H, a: sleeve } = await alpha(`${dir}/mask-sleeve.png`);
  const on = (x, y) => {
    x = Math.round(x);
    y = Math.round(y);
    return x >= 0 && y >= 0 && x < W && y < H && sleeve[y * W + x] > 128;
  };
  // On the mask AND at least CLEAR px from its edge (checked in 16 directions)
  const deep = (x, y) => {
    if (!on(x, y)) return false;
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * 2 * Math.PI;
      if (!on(x + CLEAR * Math.cos(t), y + CLEAR * Math.sin(t))) return false;
    }
    return true;
  };
  const blockPts = [];
  for (const f of ["mask-cuff.png", "mask-sleeve-tip.png"])
    if (fs.existsSync(`${dir}/${f}`)) {
      const m = (await alpha(`${dir}/${f}`)).a;
      for (let i = 0; i < m.length; i++) if (m[i] > 128) blockPts.push([i % W, (i / W) | 0]);
    }

  const zones = { mid: {}, upper: {} };
  for (const [side, isSide, outwardSign] of [
    ["right", (x) => x < W / 2, -1], // wearer's right = viewer's left; outer edge is toward smaller x
    ["left", (x) => x >= W / 2, 1],
  ]) {
    const pts = [];
    for (let i = 0; i < sleeve.length; i++) {
      const x = i % W, y = (i / W) | 0;
      if (sleeve[i] > 128 && isSide(x)) pts.push([x, y]);
    }
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of pts) {
      sxx += (x - mx) ** 2;
      syy += (y - my) ** 2;
      sxy += (x - mx) * (y - my);
    }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    let d = [Math.cos(th), Math.sin(th)];
    if (d[1] < 0) d = [-d[0], -d[1]]; // shoulder (top) -> hem (bottom)
    const n = [-d[1], d[0]];
    const proj = ([x, y]) => [(x - mx) * d[0] + (y - my) * d[1], (x - mx) * n[0] + (y - my) * n[1]];
    let t0 = Infinity, t1 = -Infinity;
    for (const p of pts) {
      const [t] = proj(p);
      t0 = Math.min(t0, t);
      t1 = Math.max(t1, t);
    }
    // Clearance line: the highest cuff / tipping pixel on this sleeve, less CLEAR
    let tCuff = t1;
    for (const p of blockPts) if (isSide(p[0])) tCuff = Math.min(tCuff, proj(p)[0] - CLEAR);
    const axisDeg = (Math.atan2(-d[0], d[1]) * 180) / Math.PI; // box "down" along the axis
    // Which way along n is the outer edge (away from the torso)?
    const nOut = Math.sign(n[0]) === outwardSign ? 1 : -1;

    const section = (t) => {
      const px = mx + d[0] * t, py = my + d[1] * t;
      let lo = 0, hi = 0;
      while (on(px + n[0] * (lo - 1), py + n[1] * (lo - 1))) lo--;
      while (on(px + n[0] * (hi + 1), py + n[1] * (hi + 1))) hi++;
      return { px, py, lo, hi, width: hi - lo + 1 };
    };
    // Box sampling: u across the box's width (local x), v across its height, rotated by rot
    const coverage = (cx, cy, w, h, rotDeg, test) => {
      const a = (rotDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      let inside = 0, total = 0;
      for (let v = -h / 2 + 1; v < h / 2; v += 2)
        for (let u = -w / 2 + 1; u < w / 2; u += 2, total++) if (test(cx + u * c - v * s, cy + u * s + v * c)) inside++;
      return inside / total;
    };
    const gapToBlockers = (cx, cy, w, h, rotDeg) => {
      const a = (rotDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      let gap = Infinity;
      for (const [bx, by] of blockPts) {
        const u = (bx - cx) * c + (by - cy) * s, v = -(bx - cx) * s + (by - cy) * c;
        gap = Math.min(gap, Math.hypot(Math.max(0, Math.abs(u) - w / 2), Math.max(0, Math.abs(v) - h / 2)));
      }
      return gap;
    };

    // --- Mid sleeve ---
    {
      let t = t0 + MID.along * (t1 - t0), cx, cy, s, sec, gap, nudged = 0;
      for (;;) {
        sec = section(t);
        const mid = (sec.lo + sec.hi) / 2;
        cx = sec.px + n[0] * mid;
        cy = sec.py + n[1] * mid;
        s = MID.box * sec.width;
        gap = gapToBlockers(cx, cy, s, s, axisDeg);
        if (gap >= CLEAR || t <= t0) break;
        t -= 1;
        nudged++;
      }
      const rot = r1(axisDeg);
      zones.mid[side] = {
        box: { x: r1(cx - s / 2), y: r1(cy - s / 2), w: r1(s), h: r1(s), rotation: rot, scaleX: MID.scaleX },
        report: { cx, cy, w: s, h: s, rot, cover: coverage(cx, cy, s, s, rot, on), gap, maskWidth: sec.width, nudged },
      };
    }

    // --- Upper sleeve ---
    {
      const t = t0 + UPPER.along * (t1 - t0), sec = section(t);
      const mid = (sec.lo + sec.hi) / 2 + nOut * UPPER.outward * sec.width;
      const cx = sec.px + n[0] * mid, cy = sec.py + n[1] * mid;
      const rot = r1(axisDeg + 90); // long side (local x) runs along the sleeve
      // Largest rectangle (by area) with its long side along the sleeve (w >= h): for each
      // aspect ratio, the longest w that stays >=95% on the mask with a 12 px margin and 12 px
      // clear of the cuff / tipping, capped at 60% of the shoulder-to-cuff length
      const sleeveLen = tCuff + CLEAR - t0; // shoulder seam to the top of the cuff / tipping
      const want = UPPER.maxLength * sleeveLen;
      const fits = (w, h) => coverage(cx, cy, w, h, rot, deep) >= UPPER.inside && gapToBlockers(cx, cy, w, h, rot) >= CLEAR;
      let w = 0, h = 0;
      for (let aspect = 1; aspect <= 5.001; aspect += 0.1) {
        let lo = 0, hi = want; // binary search the long side for this aspect
        for (let k = 0; k < 18; k++) {
          const m = (lo + hi) / 2;
          if (fits(m, m / aspect)) lo = m;
          else hi = m;
        }
        if (lo * (lo / aspect) > w * h) {
          w = lo;
          h = lo / aspect;
        }
      }
      zones.upper[side] = {
        box: { x: r1(cx - w / 2), y: r1(cy - h / 2), w: r1(w), h: r1(h), rotation: rot, scaleX: 1 },
        report: {
          cx, cy, w, h, rot, cover: coverage(cx, cy, w, h, rot, on), coverDeep: coverage(cx, cy, w, h, rot, deep),
          gap: gapToBlockers(cx, cy, w, h, rot), maskWidth: sec.width, want, sleeveLen,
        },
      };
    }
  }

  const who = { left: "wearer's left", right: "wearer's right" };
  const Side = { left: "Left", right: "Right" };
  const make = (side, kind) => {
    const z = zones[kind][side];
    return {
      id: `${side}-sleeve${kind === "upper" ? "-upper" : ""}`,
      label: `${Side[side]} sleeve, ${kind} (${who[side]})`,
      ...z.box,
    };
  };
  // Chest zones first, then sleeves: upper before mid on each side
  cfg.zones = [
    ...cfg.zones.filter((z) => !z.id.includes("sleeve")),
    make("left", "upper"),
    make("left", "mid"),
    make("right", "upper"),
    make("right", "mid"),
  ];
  fs.writeFileSync(`${dir}/template.json`, JSON.stringify(cfg, null, 2) + "\n");

  for (const kind of ["upper", "mid"])
    for (const side of ["left", "right"]) {
      const r = zones[kind][side].report;
      console.log(
        `${type} ${side}-sleeve${kind === "upper" ? "-upper" : ""}: centre (${r.cx.toFixed(1)}, ${r.cy.toFixed(1)}), ` +
          `${r.w.toFixed(1)}×${r.h.toFixed(1)} px (${(r.w / cfg.pxPerCm).toFixed(1)}×${(r.h / cfg.pxPerCm).toFixed(1)} cm), rotation ${r.rot}°, ` +
          `${(r.cover * 100).toFixed(1)}% on mask-sleeve` +
          (r.coverDeep !== undefined ? ` (${(r.coverDeep * 100).toFixed(1)}% with 12 px margin)` : "") +
          `, ${r.gap.toFixed(1)} px from cuff/tipping, mask width ${r.maskWidth} px` +
          (r.want !== undefined ? `, long side ${r.w.toFixed(0)} of ${r.want.toFixed(0)} px wanted (sleeve length ${r.sleeveLen.toFixed(0)} px)` : "") +
          (r.want !== undefined && r.w / cfg.pxPerCm < UPPER.minCm ? `
  ! WARNING: long side is ${(r.w / cfg.pxPerCm).toFixed(1)} cm, under ${UPPER.minCm} cm` : "") +
          (r.nudged ? `, moved ${r.nudged} px toward the shoulder` : "")
      );
    }
}

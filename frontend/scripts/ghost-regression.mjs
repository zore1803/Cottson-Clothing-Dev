// Ghost-template (without mannequin) regression renders, taken from the real /mockup-lab page in
// headless Chrome so they exercise the exact browser renderer.
//
//   node scripts/ghost-regression.mjs capture   -> writes <repo>/tmp/mockup-baseline/*.png
//   node scripts/ghost-regression.mjs compare   -> renders again and diffs against the baseline
//
// Needs the dev server on http://localhost:3000 (npm run dev). Chrome path: CHROME env var, else
// the default Windows install. The logo is generated here, so inputs are identical every run.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const mode = process.argv[2];
if (mode !== "capture" && mode !== "compare") {
  console.error("Usage: node scripts/ghost-regression.mjs capture|compare");
  process.exit(2);
}
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASE_DIR = path.join(ROOT, "tmp", "mockup-baseline");
const OUT_DIR = mode === "capture" ? BASE_DIR : path.join(ROOT, "tmp", "mockup-current");
const URL_BASE = process.env.APP_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

// product, body colour override (swatch name, or null = product default)
const CASES = [
  ["classic-polo-black", null],
  ["classic-polo-navy", null],
  ["classic-polo-black", "White"],
  ["indus-01", null],
  ["tipped-polo-skyblue", null],
  ["indus-01", "Navy"],
];

fs.mkdirSync(OUT_DIR, { recursive: true });
const logoPath = path.join(ROOT, "tmp", "regression-logo.png");
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect x="10" y="10" width="580" height="280" rx="40" fill="#c8102e"/><circle cx="150" cy="150" r="90" fill="#ffffff"/><text x="270" y="190" font-family="Arial" font-weight="700" font-size="120" fill="#f2b705">CC</text></svg>`
  )
)
  .png()
  .toFile(logoPath);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ghost-regression-"));
const chrome = spawn(CHROME, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1600,1100", "--hide-scrollbars", "--no-first-run", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
  } catch {}
}
if (!target) throw new Error("Chrome did not start");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const js = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (expr, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await js(expr).catch(() => false)) return;
    await sleep(150);
  }
  throw new Error(`timeout waiting for ${expr}`);
};
await send("Page.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false });

let failed = 0;
for (const [slug, body] of CASES) {
  // style=ghost: the lab defaults to the mannequin style for polos since Phase C1
  await send("Page.navigate", { url: `${URL_BASE}/mockup-lab?product=${slug}&style=ghost` });
  await waitFor(`!!document.querySelector('canvas[role=img]') && document.readyState === 'complete'`);
  await sleep(1200);
  if (body) {
    const has = await js(`!!document.querySelector('button[aria-label="${body}"]')`);
    if (!has) await js(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Body')).click()`);
    await js(`document.querySelector('button[aria-label="${body}"]').click()`);
  }
  const { root } = await send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
  await send("DOM.setFileInputFiles", { nodeId, files: [logoPath] });
  await waitFor(`[...document.querySelectorAll('select option')].some(o => o.value === 'left-chest')`);
  await sleep(3500); // embroidery stitching + re-render
  const dataUrl = await js(`document.querySelector('canvas[role=img]').toDataURL('image/png')`);
  const name = `${slug}${body ? "-" + body.toLowerCase() : ""}.png`;
  fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(dataUrl.split(",")[1], "base64"));
  if (mode === "compare") {
    const a = await sharp(path.join(BASE_DIR, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(path.join(OUT_DIR, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let diff = 0;
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) diff = -1;
    else for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) diff++;
    console.log(`${name}: ${diff === -1 ? "SIZE MISMATCH" : `${diff} differing pixels`}`);
    if (diff !== 0) failed++;
  } else console.log(`captured ${name}`);
}
ws.close();
chrome.kill();
if (mode === "compare") {
  console.log(failed ? `FAILED: ${failed} of ${CASES.length} renders differ` : `OK: all ${CASES.length} renders pixel-identical`);
  process.exit(failed ? 1 : 0);
}

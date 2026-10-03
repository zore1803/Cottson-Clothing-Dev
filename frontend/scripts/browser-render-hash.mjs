// Prints the hash of the shared core's output as rendered IN THE BROWSER (/mockup-lab?perf=1
// records it on the canvas as data-rgba-hash), for a design given as URL parameters:
//   node scripts/browser-render-hash.mjs "view=front&trim=double&trim1=c8102e&trim2=f5f5f2&body=1f2a44"
// Needs the dev server (npm run dev). CHROME env var overrides the Chrome path.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const query = process.argv[2] ?? "";
const URL_BASE = process.env.APP_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9800 + Math.floor(Math.random() * 150);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "render-hash-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1440,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
try {
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
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;
  await send("Page.enable");
  await send("Page.navigate", { url: `${URL_BASE}/mockup-lab?product=classic-polo-navy&style=mannequin&perf=1&${query}` });
  let hash;
  for (let i = 0; i < 200 && !hash; i++) {
    await sleep(150);
    hash = await js(`document.querySelector("canvas[data-mannequin]")?.dataset.rgbaHash`);
  }
  if (!hash) throw new Error("no render hash on the page");
  console.log(hash);
  ws.close();
} finally {
  chrome.kill();
}

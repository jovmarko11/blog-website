#!/usr/bin/env node
/**
 * screenshot.mjs — look at a post the way readers will.
 *
 *   node .claude/skills/project-post/scripts/screenshot.mjs <url> [--out /tmp/post-shots] [--step]
 *
 * Saves one PNG per <figure> for desktop-dark (1280), desktop-light (1280) and mobile (390, dark),
 * and prints console/page errors. With --step, also clicks "next" through every frame player
 * ([data-act="next"]) and saves its last frame.
 *
 * Needs a browser driver. Once per machine, in the site repo:  npm i --no-save puppeteer
 * (downloads its own Chrome). Or set CHROME_PATH to an installed Chrome/Chromium and install
 * puppeteer-core instead.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
if (!url) {
  console.error("usage: screenshot.mjs <url> [--out dir] [--step]");
  process.exit(2);
}
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : "/tmp/post-shots";
const step = args.includes("--step");
mkdirSync(out, { recursive: true });

let puppeteer;
// root in containers/CI needs --no-sandbox
let launch = { headless: true, args: process.getuid?.() === 0 ? ["--no-sandbox", "--disable-dev-shm-usage"] : [] };
try {
  puppeteer = (await import("puppeteer")).default;
} catch {
  try {
    puppeteer = (await import("puppeteer-core")).default;
    if (!process.env.CHROME_PATH) throw new Error("set CHROME_PATH for puppeteer-core");
    launch.executablePath = process.env.CHROME_PATH;
  } catch (e) {
    console.error("No browser driver. Run `npm i --no-save puppeteer` in the site repo.", e.message);
    process.exit(2);
  }
}

const browser = await puppeteer.launch(launch);
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const views = [
  ["desktop-dark", 1280, "dark"],
  ["desktop-light", 1280, "light"],
  ["mobile", 390, "dark"],
];
let saved = 0;
for (const [name, width, theme] of views) {
  await page.setViewport({ width, height: 900 });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  const figs = await page.$$("figure");
  for (let i = 0; i < figs.length; i++) {
    await figs[i].scrollIntoView();
    await pause(500);
    await figs[i].screenshot({ path: join(out, `${name}-fig${String(i + 1).padStart(2, "0")}.png`) });
    saved++;
  }
}

if (step) {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: "networkidle0" });
  const figs = await page.$$("figure");
  for (let i = 0; i < figs.length; i++) {
    const next = await figs[i].$('[data-act="next"]');
    if (!next) continue;
    await figs[i].scrollIntoView();
    for (let k = 0; k < 60; k++) {
      if (await next.evaluate((b) => b.disabled)) break;
      await next.click();
      await pause(800);
    }
    await figs[i].screenshot({ path: join(out, `last-frame-fig${String(i + 1).padStart(2, "0")}.png`) });
    saved++;
  }
}

await browser.close();
console.log(`saved ${saved} screenshots to ${out}`);
console.log(errors.length ? `errors:\n  ${[...new Set(errors)].join("\n  ")}` : "no errors");

#!/usr/bin/env node
// Rasterizes SVG cards to PNG and copies screenshots into images-png/
// Requires puppeteer — run: npm install (in publisher/ dir)
// Or run from: /Documents/Docita/videos/capture/ where puppeteer is pre-installed.
import { readdirSync, copyFileSync, mkdirSync } from "fs";
import { resolve, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IMG_IN = resolve(ROOT, "images");
const IMG_OUT = resolve(ROOT, "images-png");
mkdirSync(IMG_OUT, { recursive: true });

let puppeteer;
try {
  puppeteer = (await import("puppeteer")).default;
} catch {
  // Try the videos/capture install
  const capturePuppeteer = "/Users/vamsikrishnachandaluri/Documents/Docita/videos/capture/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js";
  puppeteer = (await import(capturePuppeteer)).default;
}

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080 });

const files = readdirSync(IMG_IN);
for (const f of files) {
  const ext = extname(f).toLowerCase();
  const src = resolve(IMG_IN, f);
  const outName = basename(f, ext) + ".png";
  const out = resolve(IMG_OUT, outName);

  if (ext === ".svg") {
    // Use file:// so relative hrefs in the SVG (logo, wordmark PNGs) resolve correctly.
    const fileUrl = `file://${src}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0" });
    await page.screenshot({ path: out, type: "png" });
    console.log(`  rasterized ${f} → ${outName}`);
  } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    copyFileSync(src, out);
    console.log(`  copied ${f} → ${outName}`);
  }
}

await browser.close();
console.log("Done.");

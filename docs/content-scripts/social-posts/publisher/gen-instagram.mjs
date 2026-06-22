#!/usr/bin/env node
// Builds Instagram-ready PNGs:
//   1. Rasterizes all SVG cards → images-png/<slug>.png (1080×1080)
//   2. Composes mobile screenshots into a branded phone frame → images-png/<name>-ig.png (1080×1350)
//   3. Falls back to a branded browser frame for screens with no mobile capture
//   4. Copies/downscales desktop screenshots → images-png/<name>.png (1920×1080, for X/LinkedIn)
//
// Run from publisher/ (puppeteer installed here): node gen-instagram.mjs
import { readdirSync, readFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { resolve, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IMG_IN = resolve(ROOT, "images");
const IMG_OUT = resolve(ROOT, "images-png");
const MOBILE = "/Users/vamsikrishnachandaluri/Documents/Docita/videos/capture/mobile-screens";
mkdirSync(IMG_OUT, { recursive: true });

const INK = "#0E1419", TEAL = "#4DE3D2";
const WORDMARK = resolve(IMG_IN, "Docita_Wordmark_HQ.png");

// Map each screenshot post image → its mobile capture (in MOBILE dir).
// If a mobile capture is missing, we fall back to a browser frame of the desktop shot.
const SCREEN_MAP = {
  "shot-today":        "today.png",
  "shot-appointments": "appointments.png",
  "shot-prescription": "prescription-detail.png",
  "shot-invoices":     "invoices.png",
  "shot-patients":     "patients.png",
  "shot-analytics":    "analytics.png",
  "shot-lab-tests":    "lab-tests.png",
  "shot-consultation": "consultation.png",
  // NOTE: hospital-beds & onboarding have no valid capture (routes bounced to /today).
  // Those posts use branded cards instead — recapture mobile when the dev app is up.
};

const b64 = (p) => readFileSync(p).toString("base64");
const dataUri = (p) => `data:image/png;base64,${b64(p)}`;

const wmUri = dataUri(WORDMARK);

function phoneFrameHtml(screenUri) {
  // 1080×1350 portrait, dark branded canvas, screenshot in a rounded phone bezel.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1080px;height:1350px;overflow:hidden}
    .canvas{position:relative;width:1080px;height:1350px;background:${INK};
      display:flex;flex-direction:column;align-items:center;justify-content:center}
    .glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);
      width:1100px;height:1100px;border-radius:50%;
      background:radial-gradient(circle, rgba(77,227,210,0.16) 0%, rgba(77,227,210,0) 62%)}
    .phone{position:relative;z-index:2;width:556px;height:1150px;background:#05080b;
      border-radius:54px;padding:16px;box-shadow:0 40px 90px rgba(0,0,0,0.55);
      border:1px solid rgba(255,255,255,0.07)}
    .screen{width:100%;height:100%;border-radius:40px;overflow:hidden;background:#fff}
    .screen img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
    .notch{position:absolute;top:24px;left:50%;transform:translateX(-50%);
      width:150px;height:26px;background:#05080b;border-radius:0 0 18px 18px;z-index:3}
    .wm{position:absolute;bottom:54px;left:50%;transform:translateX(-50%);z-index:2;height:46px}
  </style></head><body>
    <div class="canvas">
      <div class="glow"></div>
      <div class="phone">
        <div class="notch"></div>
        <div class="screen"><img src="${screenUri}"></div>
      </div>
      <img class="wm" src="${wmUri}">
    </div>
  </body></html>`;
}

function browserFrameHtml(shotUri) {
  // 1080×1350 portrait, dark branded canvas, desktop screenshot in a browser window.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1080px;height:1350px;overflow:hidden}
    .canvas{position:relative;width:1080px;height:1350px;background:${INK};
      display:flex;flex-direction:column;align-items:center;justify-content:center}
    .glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);
      width:1100px;height:1100px;border-radius:50%;
      background:radial-gradient(circle, rgba(77,227,210,0.16) 0%, rgba(77,227,210,0) 62%)}
    .win{position:relative;z-index:2;width:980px;border-radius:18px;overflow:hidden;
      background:#1A2230;box-shadow:0 40px 90px rgba(0,0,0,0.55);
      border:1px solid rgba(255,255,255,0.08)}
    .bar{height:46px;display:flex;align-items:center;gap:10px;padding:0 20px;background:#0E1419}
    .dot{width:13px;height:13px;border-radius:50%}
    .r{background:#E5484D}.y{background:#E3B341}.g{background:#3BA776}
    .win img{width:100%;display:block}
    .wm{position:absolute;bottom:64px;left:50%;transform:translateX(-50%);z-index:2;height:46px}
  </style></head><body>
    <div class="canvas">
      <div class="glow"></div>
      <div class="win">
        <div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
        <img src="${shotUri}">
      </div>
      <img class="wm" src="${wmUri}">
    </div>
  </body></html>`;
}

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

// ---- 1. Rasterize SVG cards → PNG (square 1080×1080, portrait -ig 1080×1350) ----
for (const f of readdirSync(IMG_IN)) {
  if (extname(f).toLowerCase() !== ".svg") continue;
  const out = resolve(IMG_OUT, basename(f, ".svg") + ".png");
  const isPortrait = f.endsWith("-ig.svg");
  await page.setViewport({ width: 1080, height: isPortrait ? 1350 : 1080 });
  await page.goto(`file://${resolve(IMG_IN, f)}`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: out, type: "png" });
  console.log(`  card  ${f} → ${basename(out)} (${isPortrait ? "1080×1350" : "1080×1080"})`);
}

// ---- 2. Instagram mobile/browser frames for screenshot posts ----
await page.goto("about:blank"); // leave the SVG doc so setContent (document.open) works
await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
for (const [shot, mobileFile] of Object.entries(SCREEN_MAP)) {
  const out = resolve(IMG_OUT, `${shot}-ig.png`);
  const mobilePath = mobileFile ? resolve(MOBILE, mobileFile) : null;
  let html, kind;
  if (mobilePath && existsSync(mobilePath)) {
    html = phoneFrameHtml(dataUri(mobilePath));
    kind = "phone";
  } else {
    const desktop = resolve(IMG_IN, `${shot}.png`);
    if (!existsSync(desktop)) { console.warn(`  skip ${shot}: no mobile or desktop source`); continue; }
    html = browserFrameHtml(dataUri(desktop));
    kind = "browser(fallback)";
  }
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: out, type: "png" });
  console.log(`  IG    ${shot}-ig.png  [${kind}]`);
}

// ---- 3. Copy/downscale desktop screenshots → images-png (for X/LinkedIn) ----
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
for (const f of readdirSync(IMG_IN)) {
  if (!f.startsWith("shot-") || extname(f).toLowerCase() !== ".png") continue;
  const out = resolve(IMG_OUT, f);
  const html = `<!doctype html><html><head><style>*{margin:0;padding:0}
    html,body{width:1920px;height:1080px;background:${INK}}
    img{width:1920px;height:1080px;object-fit:cover;display:block}</style></head>
    <body><img src="${dataUri(resolve(IMG_IN, f))}"></body></html>`;
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: out, type: "png" });
  console.log(`  X     ${f} → 1920×1080`);
}

// ---- 4. Copy any remaining raster assets (logo etc.) ----
for (const f of readdirSync(IMG_IN)) {
  const ext = extname(f).toLowerCase();
  if ((ext === ".png" || ext === ".jpg") && !f.startsWith("shot-")) {
    copyFileSync(resolve(IMG_IN, f), resolve(IMG_OUT, f));
  }
}

await browser.close();
console.log("Done.");

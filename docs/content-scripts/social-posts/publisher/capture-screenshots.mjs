#!/usr/bin/env node
// Capture fresh screenshots of invoice + prescription detail pages.
//   - Prescription: captures the actual Rx document card (clean, no chrome)
//   - Invoice: captures the invoice detail page
//   - Both generate normal (desktop) + IG (1080×1350 browser frame) versions
// Usage: node capture-screenshots.mjs
// Requires: dev servers running (pnpm dev in apps/api + apps/app)

import { readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IMG_OUT = resolve(ROOT, "images-png");
const IMG_IN = resolve(ROOT, "images");
const WORDMARK = resolve(IMG_IN, "Docita_Wordmark_HQ.png");

mkdirSync(IMG_OUT, { recursive: true });

const APP_URL = "http://localhost:3000";
const API_URL = "http://127.0.0.1:3001/api/v1";
const INK = "#0E1419";

const b64 = (p) => readFileSync(p).toString("base64");
const dataUri = (p) => `data:image/png;base64,${b64(p)}`;
const wmUri = existsSync(WORDMARK) ? dataUri(WORDMARK) : null;

// ── 1. Login ──────────────────────────────────────────────────────────────
async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin.doctor@docita.work", password: "password123" }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    token: data.access_token,
    user: {
      id: data.user.id,
      clinicId: data.user.clinicId,
      role: data.user.role,
      name: data.user.name,
    },
  };
}

// ── 2. New page with auth injected ────────────────────────────────────────
async function authPage(browser, session) {
  const page = await browser.newPage();

  await page.evaluateOnNewDocument((s) => {
    localStorage.setItem("docita_token", s.token);
    localStorage.setItem("docita_user", JSON.stringify({
      id: s.user.id,
      clinicId: s.user.clinicId,
      role: s.user.role,
    }));
    localStorage.setItem("selectedClinicId", s.user.clinicId);
    localStorage.setItem("selectedClinic", JSON.stringify({
      id: s.user.clinicId,
      name: "Docita General Hospital",
      tier: "ENTERPRISE",
      type: "GENERAL",
    }));
    sessionStorage.setItem("__docita_e2e_access_token", s.token);
  }, session);

  await page.setCookie(
    { name: "access_token", value: session.token, domain: "localhost", path: "/", httpOnly: false, secure: false },
    { name: "refresh_token", value: session.token, domain: "localhost", path: "/", httpOnly: false, secure: false },
  );

  return page;
}

// ── 3. Capture full page screenshot ───────────────────────────────────────
async function capturePage(browser, session, pathname, filename, width = 1920, height = 1080) {
  const page = await authPage(browser, session);
  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  const url = `${APP_URL}${pathname}`;
  console.log(`  → ${url}`);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));

  const outPath = resolve(IMG_OUT, filename);
  await page.screenshot({ path: outPath, type: "png", fullPage: false });
  console.log(`  ✓ saved ${filename} (${width}×${height})`);
  await page.close();
  return outPath;
}

// ── 4. Capture element screenshot (Rx document card) ──────────────────────
async function captureElement(browser, session, pathname, filename, width = 1000, height = 1400) {
  const page = await authPage(browser, session);
  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  const url = `${APP_URL}${pathname}`;
  console.log(`  → ${url}`);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  // Wait until the document heading appears (clinic name or "Dr.")
  await page.waitForFunction(
    () => document.body.innerText.includes("Dr.") || document.body.innerText.includes("Medications"),
    { timeout: 15000 },
  );

  // Get the inner content wrapper inside print-sheet (the actual Rx document card area)
  const el = await page.evaluateHandle(() => {
    // Find the print-sheet's content div (the one with the card)
    const sheet = document.querySelector('.print-sheet');
    if (!sheet) return null;
    // The content div is the second layer (first child is the print button row, second is the card wrapper)
    const content = sheet.children[1];
    return content || sheet;
  });

  if (!el) throw new Error("Could not locate prescription document element");

  const outPath = resolve(IMG_OUT, filename);
  await el.screenshot({ path: outPath, type: "png" });
  console.log(`  ✓ saved ${filename} [Rx document element]`);
  await page.close();
  return outPath;
}

// ── 5. IG frame ───────────────────────────────────────────────────────────
function browserFrameHtml(shotDataUri) {
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
        <img src="${shotDataUri}">
      </div>
      ${wmUri ? `<img class="wm" src="${wmUri}">` : ""}
    </div>
  </body></html>`;
}

async function createIgFrame(browser, desktopPath, igFilename) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  const html = browserFrameHtml(dataUri(desktopPath));
  await page.setContent(html, { waitUntil: "networkidle0" });
  const outPath = resolve(IMG_OUT, igFilename);
  await page.screenshot({ path: outPath, type: "png" });
  console.log(`  ✓ saved ${igFilename} [browser frame]`);
  await page.close();
}

// ── 6. Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log("Logging in as admin.doctor@docita.work...");
  const session = await login();
  console.log(`  user: ${session.user.name} (${session.user.role})`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ── Invoice: full page screenshot ────────────────────────────────────
    console.log("\n📄 Invoice page...");
    const invDesktop = await capturePage(
      browser, session,
      "/invoices/seed-invoice-rajesh",
      "shot-invoices.png",
    );

    // ── Prescription: element screenshot of the actual Rx document ───────
    console.log("\n💊 Prescription document (actual Rx)...");
    const presDesktop = await captureElement(
      browser, session,
      "/prescriptions/seed-prescription-rajesh",
      "shot-prescription.png",
      1000, 1400,
    );

    // ── IG versions ──────────────────────────────────────────────────────
    console.log("\n📱 Creating IG versions...");
    await createIgFrame(browser, invDesktop, "shot-invoices-ig.png");
    await createIgFrame(browser, presDesktop, "shot-prescription-ig.png");

    console.log("\n✅ Done — all screenshots saved to images-png/");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

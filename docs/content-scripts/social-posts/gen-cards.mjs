#!/usr/bin/env node
// Generates branded 1080×1080 SVG cards for social posts.
// No dependencies — run: node gen-cards.mjs
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "images");
mkdirSync(OUT, { recursive: true });

const PAD = 96;
const INK = "#0E1419", PAPER = "#FAF9F5";
const TEAL = "#4DE3D2", ROSE = "#E5484D";
const HEAD_SIZE = 70, LINE_H = 92, SUB_SIZE = 32, EYE_SIZE = 22;

// Wordmark only — centred, with bottom padding.
const WM_H = 44;
const WM_W = Math.round(WM_H * 857 / 413); // ≈91px — preserves 857×413 aspect ratio
const WM_BOTTOM_PAD = 52; // px from card bottom edge

// Output sizes: square for X/LinkedIn, portrait (4:5) for Instagram feed.
const SIZES = [
  { W: 1080, H: 1080, suffix: "" },      // square — universal
  { W: 1080, H: 1350, suffix: "-ig" },   // 4:5 portrait — Instagram
];

function hex2rgb(h) {
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
  return `${r},${g},${b}`;
}

function card({ slug, eyebrow, lines, sub, accent = "paper", disclaimer = "" }, { W, H, suffix }) {
  const accentColor = accent === "teal" ? TEAL : accent === "rose" ? ROSE : PAPER;
  const rgb = hex2rgb(accentColor);
  const totalTextH = lines.length * LINE_H;
  const textStartY = (H / 2) - (totalTextH / 2) + HEAD_SIZE * 0.8;

  const linesSvg = lines.map((ln, i) => {
    const y = textStartY + i * LINE_H;
    const col = ln.c ? (ln.c === "teal" ? TEAL : ln.c === "rose" ? ROSE : PAPER) : PAPER;
    return `<text x="${W/2}" y="${y}" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-size="${HEAD_SIZE}" font-weight="700" fill="${col}" letter-spacing="-1">${ln.t ?? ln}</text>`;
  }).join("\n    ");

  const subY = textStartY + lines.length * LINE_H + 36;
  const eyeY = PAD + EYE_SIZE;
  const disclaimerSvg = disclaimer
    ? `<text x="${W/2}" y="${H - PAD - 56}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="18" fill="${PAPER}" opacity="0.45">${disclaimer}</text>`
    : "";

  // Wordmark centred horizontally, with WM_BOTTOM_PAD from card bottom.
  const wmX = (W - WM_W) / 2;
  const wmY = H - WM_H - WM_BOTTOM_PAD;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="rgb(${rgb})" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="rgb(${rgb})" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="32" y="32" width="${W-64}" height="${H-64}" rx="16" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.35"/>
  <text x="${W/2}" y="${eyeY}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="${EYE_SIZE}" font-weight="400" fill="${accentColor}" letter-spacing="3">${eyebrow.toUpperCase()}</text>
  ${linesSvg}
  ${sub ? `<text x="${W/2}" y="${subY}" text-anchor="middle" font-family="Inter,sans-serif" font-size="${SUB_SIZE}" font-weight="400" fill="${PAPER}" opacity="0.65">${sub}</text>` : ""}
  ${disclaimerSvg}
  <image href="Docita_Wordmark_HQ.png" x="${wmX}" y="${wmY}" width="${WM_W}" height="${WM_H}"/>
</svg>`;
  writeFileSync(`${OUT}/${slug}${suffix}.svg`, svg);
  console.log(`  wrote ${slug}${suffix}.svg (${W}×${H})`);
}

const cards = [
  // Product cards
  {
    slug: "card-start-small",
    eyebrow: "Docita",
    lines: [
      { t: "Start small.", c: "teal" },
      { t: "Grow fast." },
    ],
    sub: "One clinic to a hospital network — same platform.",
    accent: "teal",
  },
  {
    slug: "card-whatsapp-chaos",
    eyebrow: "Sound familiar?",
    lines: [
      { t: "Appointments via" },
      { t: "WhatsApp.", c: "rose" },
      { t: "Chaos guaranteed." },
    ],
    sub: "There's a better way.",
    accent: "rose",
  },
  {
    slug: "card-burnout",
    eyebrow: "Doctor burnout",
    lines: [
      { t: "Admin work" },
      { t: "won't fix itself.", c: "rose" },
    ],
    sub: "Docita automates the paperwork.",
    accent: "rose",
  },
  {
    slug: "card-follow-ups",
    eyebrow: "Follow-ups",
    lines: [
      { t: "Patients forget.", c: "rose" },
      { t: "Docita reminds." },
    ],
    sub: "Automated follow-up reminders.",
    accent: "teal",
  },
  {
    slug: "card-one-place",
    eyebrow: "Everything",
    lines: [
      { t: "One place." },
      { t: "Zero tabs.", c: "teal" },
    ],
    sub: "Records, billing, appointments — unified.",
    accent: "teal",
  },
  {
    slug: "card-receptionist",
    eyebrow: "Front desk",
    lines: [
      { t: "Your receptionist", c: "teal" },
      { t: "never sleeps." },
    ],
    sub: "Online booking + WhatsApp — 24/7.",
    accent: "teal",
  },
  {
    slug: "card-excel",
    eyebrow: "Still on Excel?",
    lines: [
      { t: "Excel was not" },
      { t: "built for clinics.", c: "rose" },
    ],
    sub: "Import your data and move on.",
    accent: "rose",
  },
  {
    slug: "card-one-patient-test",
    eyebrow: "Free trial",
    lines: [
      { t: "One patient.", c: "teal" },
      { t: "One appointment." },
      { t: "See the magic." },
    ],
    sub: "30 days free. No card needed.",
    accent: "teal",
  },
  {
    slug: "card-handoffs",
    eyebrow: "Handoffs",
    lines: [
      { t: "Nothing falls" },
      { t: "through the cracks.", c: "teal" },
    ],
    sub: "Complete patient history at your fingertips.",
    accent: "teal",
  },
  {
    slug: "card-stress-badge",
    eyebrow: "Clinic stress",
    lines: [
      { t: "The billing stress" },
      { t: "stops here.", c: "teal" },
    ],
    sub: "GST invoices, one click.",
    accent: "teal",
  },
  {
    slug: "card-hospital-beds",
    eyebrow: "Hospitals",
    lines: [
      { t: "Every bed.", c: "teal" },
      { t: "One view." },
    ],
    sub: "Occupied, vacant, due for discharge — at a glance.",
    accent: "teal",
  },
  {
    slug: "card-onboarding",
    eyebrow: "Get started",
    lines: [
      { t: "Live in minutes.", c: "teal" },
      { t: "Not days." },
    ],
    sub: "Profile. Team. Patients. Done.",
    accent: "teal",
  },
  // Educational cards
  {
    slug: "card-water-first",
    eyebrow: "Healthy living",
    lines: [
      { t: "Water first.", c: "teal" },
      { t: "Coffee second." },
    ],
    sub: "Start your day right.",
    accent: "teal",
    disclaimer: "General information only. Consult a healthcare professional.",
  },
  {
    slug: "card-protein",
    eyebrow: "Nutrition",
    lines: [
      { t: "Protein at" },
      { t: "every meal.", c: "teal" },
    ],
    sub: "Dal, paneer, eggs — it counts.",
    accent: "teal",
    disclaimer: "General information only. Consult a healthcare professional.",
  },
  {
    slug: "card-2020",
    eyebrow: "Eye health",
    lines: [
      { t: "20-20-20", c: "teal" },
      { t: "rule." },
    ],
    sub: "Every 20 mins: look 20ft away, 20 secs.",
    accent: "teal",
    disclaimer: "General information only. Consult a healthcare professional.",
  },
  {
    slug: "card-sleep",
    eyebrow: "Sleep",
    lines: [
      { t: "Sleep is not" },
      { t: "laziness.", c: "teal" },
    ],
    sub: "7-9 hours. Non-negotiable.",
    accent: "teal",
    disclaimer: "General information only. Consult a healthcare professional.",
  },
  {
    slug: "card-thali",
    eyebrow: "Nutrition",
    lines: [
      { t: "The Indian thali" },
      { t: "is nearly perfect.", c: "teal" },
    ],
    sub: "Balance it, don't replace it.",
    accent: "teal",
    disclaimer: "General information only. Consult a healthcare professional.",
  },
  {
    slug: "card-walking",
    eyebrow: "Fitness",
    lines: [
      { t: "10,000 steps", c: "teal" },
      { t: "is a myth." },
    ],
    sub: "Even 5,000 daily changes your health.",
    accent: "teal",
    disclaimer: "General information only. Consult a healthcare professional.",
  },
  {
    slug: "card-posture",
    eyebrow: "Posture",
    lines: [
      { t: "Sit like your" },
      { t: "back matters.", c: "teal" },
    ],
    sub: "Because it does.",
    accent: "teal",
    disclaimer: "General information only. Consult a healthcare professional.",
  },
];

console.log(`Generating ${cards.length} cards × ${SIZES.length} sizes…`);
for (const c of cards) for (const size of SIZES) card(c, size);
console.log("Done.");

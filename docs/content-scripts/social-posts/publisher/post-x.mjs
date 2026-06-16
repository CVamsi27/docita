#!/usr/bin/env node
// Posts to X (Twitter) via API v2 + OAuth 1.0a
// Flags: --verify (read-only auth check), --dry-run, --now (post next unposted), --id <ID>
// Requires: npm install (twitter-api-v2)
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const POSTED_PATH = resolve(__dirname, "posted.json");

// Tiny .env parser — no dotenv dependency
function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(resolve(__dirname, ".env"));

const { TwitterApi } = await import("twitter-api-v2").catch(() => {
  console.error("twitter-api-v2 not installed. Run: npm install"); process.exit(1);
});

const args = process.argv.slice(2);
const VERIFY   = args.includes("--verify");
const DRY_RUN  = args.includes("--dry-run");
const POST_NOW = args.includes("--now");
const POST_ID  = args[args.indexOf("--id") + 1] ?? null;

// Validate credentials shape
const token = process.env.X_ACCESS_TOKEN ?? "";
if (!VERIFY && !DRY_RUN && token && !/^\d+-/.test(token)) {
  console.error([
    "ERROR: X_ACCESS_TOKEN looks wrong.",
    "  It must be the OAuth 1.0a Access Token (starts with your numeric user ID, e.g. 1234567890-abc...).",
    "  NOT the Bearer Token (starts with AAAA...)",
    "  NOT the OAuth 2.0 Client ID (base64-looking).",
    "  Find it at: developer.twitter.com → Your App → Keys and Tokens → Authentication Tokens → Access Token and Secret",
  ].join("\n"));
  process.exit(1);
}

const client = new TwitterApi({
  appKey:       process.env.X_APP_KEY,
  appSecret:    process.env.X_APP_SECRET,
  accessToken:  process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

if (VERIFY) {
  try {
    const me = await client.v1.verifyCredentials();
    console.log(`OK — authenticated as @${me.screen_name} (${me.name})`);
  } catch (e) {
    console.error("Auth failed:", e.message);
    process.exit(1);
  }
  process.exit(0);
}

const schedPath = resolve(__dirname, "schedule.json");
if (!existsSync(schedPath)) {
  console.error("schedule.json not found. Run: node make-schedule.mjs first."); process.exit(1);
}
const schedule = JSON.parse(readFileSync(schedPath, "utf8"));
const posted = existsSync(POSTED_PATH) ? JSON.parse(readFileSync(POSTED_PATH, "utf8")) : {};

function resolveMedia(imgFile) {
  const pngPath = imgFile.replace("images/", "images-png/").replace(/\.svg$/, ".png");
  const candidates = [
    resolve(ROOT, pngPath),
    resolve(ROOT, imgFile),
  ];
  return candidates.find(p => existsSync(p)) ?? null;
}

async function postOne(post) {
  const mediaPath = resolveMedia(post.image?.file ?? "");
  let media_id;
  if (mediaPath) {
    console.log(`  uploading: ${mediaPath}`);
    if (!DRY_RUN) {
      media_id = await client.v1.uploadMedia(mediaPath);
    }
  } else {
    console.warn(`  warning: no media found for ${post.id} (${post.image?.file})`);
  }

  const text = post.x?.trim() ?? post.instagram?.trim() ?? "";
  console.log(`  text (first 80): ${text.slice(0, 80)}…`);

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would post ${post.id} — skipping API call.`);
    return;
  }

  const payload = { text };
  if (media_id) payload.media = { media_ids: [media_id] };
  const result = await client.v2.tweet(payload);
  posted[post.id] = { tweetId: result.data.id, postedAt: new Date().toISOString() };
  writeFileSync(POSTED_PATH, JSON.stringify(posted, null, 2));
  console.log(`Posted ${post.id} → https://x.com/docita_work/status/${result.data.id}`);
}

if (POST_ID) {
  const post = schedule.find(p => p.id === POST_ID);
  if (!post) { console.error(`Post ${POST_ID} not found in schedule.json`); process.exit(1); }
  await postOne(post);
} else if (POST_NOW) {
  const today = new Date().toISOString().slice(0, 10);
  const next = schedule.find(p => !posted[p.id] && p.scheduledDate <= today);
  if (!next) { console.log("No unposted posts due today or earlier."); process.exit(0); }
  console.log(`Posting ${next.id} — ${next.title} (scheduled ${next.scheduledDate})`);
  await postOne(next);
} else {
  console.log("Usage: node post-x.mjs [--verify] [--dry-run] [--now] [--id <ID>]");
  console.log("\nPosted so far:");
  if (Object.keys(posted).length === 0) console.log("  (none)");
  else Object.entries(posted).forEach(([id, v]) => console.log(`  ${id}: ${v.tweetId} @ ${v.postedAt}`));
}

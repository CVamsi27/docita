#!/usr/bin/env node
// fallow-ignore-file unused-file
// Posts to X (Twitter) and/or LinkedIn via their APIs
// Flags: --verify (read-only auth check), --dry-run, --now (post next unposted), --id <ID>, --x, --linkedin, --all
// Requires: npm install (twitter-api-v2)
// LinkedIn uses native fetch (Node 18+)
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

const args = process.argv.slice(2);
const VERIFY   = args.includes("--verify");
const DRY_RUN  = args.includes("--dry-run");
const POST_NOW = args.includes("--now");
const POST_ID  = args[args.indexOf("--id") + 1] ?? null;
const PLATFORM = args.includes("--all") ? "all"
  : args.includes("--linkedin") ? "linkedin"
  : args.includes("--x") ? "x"
  : "x"; // default to X for backward compatibility

// ── X (Twitter) setup ──
let twitterClient = null;
if (PLATFORM === "x" || PLATFORM === "all") {
  const { TwitterApi } = await import("twitter-api-v2").catch(() => {
    console.error("twitter-api-v2 not installed. Run: npm install"); process.exit(1);
  });

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

  twitterClient = new TwitterApi({
    appKey:       process.env.X_APP_KEY,
    appSecret:    process.env.X_APP_SECRET,
    accessToken:  process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });
}

// ── LinkedIn setup ──
const LINKEDIN_API = "https://api.linkedin.com/v2";
function getLinkedInHeaders() {
  return {
    "Authorization": `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

// ── Auth verification ──
if (VERIFY) {
  const results = [];

  if (PLATFORM === "x" || PLATFORM === "all") {
    try {
      const me = await twitterClient.v1.verifyCredentials();
      results.push(`X: OK — authenticated as @${me.screen_name} (${me.name})`);
    } catch (e) {
      results.push(`X: FAILED — ${e.message}`);
    }
  }

  if (PLATFORM === "linkedin" || PLATFORM === "all") {
    try {
      const res = await fetch(`${LINKEDIN_API}/userinfo`, {
        headers: getLinkedInHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        results.push(`LinkedIn: OK — ${data.name ?? data.sub}`);
      } else {
        const err = await res.text();
        results.push(`LinkedIn: FAILED — ${res.status} ${err}`);
      }
    } catch (e) {
      results.push(`LinkedIn: FAILED — ${e.message}`);
    }
  }

  results.forEach(r => console.log(r));
  const allOk = results.every(r => r.includes("OK"));
  process.exit(allOk ? 0 : 1);
}

// ── Load schedule ──
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

// ── X posting ──
async function postToX(post) {
  const text = post.x?.trim() ?? post.instagram?.trim() ?? "";
  console.log(`  [X] text (first 80): ${text.slice(0, 80)}…`);

  if (DRY_RUN) {
    console.log(`  [X] DRY RUN — would post.`);
    return null;
  }

  const mediaPath = resolveMedia(post.image?.file ?? "");
  let media_id;
  if (mediaPath) {
    console.log(`  [X] uploading: ${mediaPath}`);
    media_id = await twitterClient.v1.uploadMedia(mediaPath);
  }

  const payload = { text };
  if (media_id) payload.media = { media_ids: [media_id] };
  const result = await twitterClient.v2.tweet(payload);
  console.log(`  [X] Posted → https://x.com/docita_work/status/${result.data.id}`);
  return { tweetId: result.data.id };
}

// ── LinkedIn posting ──
async function postToLinkedIn(post) {
  const text = post.linkedin?.trim() ?? post.x?.trim() ?? post.instagram?.trim() ?? "";
  console.log(`  [LinkedIn] text (first 80): ${text.slice(0, 80)}…`);

  if (DRY_RUN) {
    console.log(`  [LinkedIn] DRY RUN — would post.`);
    return null;
  }

  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!personUrn) {
    console.error("  [LinkedIn] ERROR: LINKEDIN_PERSON_URN not set in .env");
    return null;
  }

  // Build the post body
  const body = {
    author: `urn:li:person:${personUrn}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  // Try to attach image if available
  const mediaPath = resolveMedia(post.image?.file ?? "");
  if (mediaPath && mediaPath.endsWith(".png")) {
    // LinkedIn image upload requires a multi-step process:
    // 1. Register upload
    // 2. Upload image binary
    // 3. Attach to post
    // For simplicity, we'll post text-only for now and note the image
    console.log(`  [LinkedIn] Note: Image available at ${mediaPath} — text-only post for now`);
  }

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: "POST",
    headers: getLinkedInHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  [LinkedIn] FAILED: ${res.status} ${err}`);
    return null;
  }

  const data = await res.json();
  const postId = data.id ?? "unknown";
  console.log(`  [LinkedIn] Posted → https://www.linkedin.com/feed/update/${postId}`);
  return { linkedInId: postId };
}

// ── Main posting logic ──
const POSTS_PATH = resolve(__dirname, "posts.json");
const SOCIAL_MD_PATH = resolve(ROOT, "SOCIAL_POSTS.md");

function syncPostsJsonStatus() {
  if (!existsSync(POSTS_PATH)) return;
  const posts = JSON.parse(readFileSync(POSTS_PATH, "utf8"));
  for (const p of posts) {
    if (posted[p.id]) {
      p.status = p.status ?? { instagram: null, x: null, linkedin: null };
      if (posted[p.id].x) p.status.x = { tweetId: posted[p.id].x.tweetId, postedAt: posted[p.id].x.postedAt };
      if (posted[p.id].linkedin) p.status.linkedin = { linkedInId: posted[p.id].linkedin.linkedInId, postedAt: posted[p.id].linkedin.postedAt };
    }
  }
  writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2));
  console.log("  [sync] Updated posts.json status markers");
}

function syncSocialPostsMd(postId) {
  if (!existsSync(SOCIAL_MD_PATH)) return;
  let md = readFileSync(SOCIAL_MD_PATH, "utf8");
  // Find the ### <ID> section and flip its status
  const sectionRe = new RegExp(`(### ${postId} —.*?\\n\\n\\*\\*Status:\\*\\*) \\[ \\] done`, "s");
  if (sectionRe.test(md)) {
    md = md.replace(sectionRe, "$1 [x] done");
    writeFileSync(SOCIAL_MD_PATH, md);
    console.log(`  [sync] Marked ${postId} done in SOCIAL_POSTS.md`);
  }
}

async function postOne(post) {
  console.log(`\nPosting ${post.id} — ${post.title} (scheduled ${post.scheduledDate})`);

  const updates = {};

  if (PLATFORM === "x" || PLATFORM === "all") {
    const xResult = await postToX(post);
    if (xResult) updates.x = { ...xResult, postedAt: new Date().toISOString() };
  }

  if (PLATFORM === "linkedin" || PLATFORM === "all") {
    const liResult = await postToLinkedIn(post);
    if (liResult) updates.linkedin = { ...liResult, postedAt: new Date().toISOString() };
  }

  // Save posted status
  if (Object.keys(updates).length > 0) {
    posted[post.id] = { ...(posted[post.id] ?? {}), ...updates };
    writeFileSync(POSTED_PATH, JSON.stringify(posted, null, 2));
    syncPostsJsonStatus();
    syncSocialPostsMd(post.id);
  }
}

if (POST_ID) {
  const post = schedule.find(p => p.id === POST_ID);
  if (!post) { console.error(`Post ${POST_ID} not found in schedule.json`); process.exit(1); }
  await postOne(post);
} else if (POST_NOW) {
  const today = new Date().toISOString().slice(0, 10);
  const next = schedule.find(p => !posted[p.id]?.x && !posted[p.id]?.linkedin && p.scheduledDate <= today);
  if (!next) { console.log("No unposted posts due today or earlier."); process.exit(0); }
  await postOne(next);
} else {
  console.log("Usage: node post-social.mjs [--verify] [--dry-run] [--now] [--id <ID>] [--x|--linkedin|--all]");
  console.log("\nPlatforms:", PLATFORM);
  console.log("\nPosted so far:");
  if (Object.keys(posted).length === 0) console.log("  (none)");
  else Object.entries(posted).forEach(([id, v]) => {
    const platforms = [];
    if (v.x) platforms.push(`X: ${v.x.tweetId}`);
    if (v.linkedin) platforms.push(`LinkedIn: ${v.linkedin.linkedInId}`);
    console.log(`  ${id}: ${platforms.join(" | ")}`);
  });
}

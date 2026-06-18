import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const POSTED_PATH = resolve(__dirname, "posted.json");
const SCHED_PATH = resolve(__dirname, "schedule.json");
const POSTS_PATH = resolve(__dirname, "posts.json");
const SOCIAL_MD_PATH = resolve(ROOT, "SOCIAL_POSTS.md");

// Tiny .env parser — no dotenv dependency
export function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(resolve(__dirname, ".env"));

export function loadSchedule() {
  if (!existsSync(SCHED_PATH)) {
    console.error("schedule.json not found. Run: node make-schedule.mjs first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(SCHED_PATH, "utf8"));
}

export function loadPosted() {
  return existsSync(POSTED_PATH) ? JSON.parse(readFileSync(POSTED_PATH, "utf8")) : {};
}

export function savePosted(posted) {
  writeFileSync(POSTED_PATH, JSON.stringify(posted, null, 2));
}

export function resolveMedia(imgFile) {
  const pngPath = imgFile.replace("images/", "images-png/").replace(/\.svg$/, ".png");
  const candidates = [
    resolve(ROOT, pngPath),
    resolve(ROOT, imgFile),
  ];
  return candidates.find(p => existsSync(p)) ?? null;
}

export function syncPostsJsonStatus(posted) {
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

export function syncSocialPostsMd(postId) {
  if (!existsSync(SOCIAL_MD_PATH)) return;
  let md = readFileSync(SOCIAL_MD_PATH, "utf8");
  const sectionRe = new RegExp(`(### ${postId} —.*?\\n\\n\\*\\*Status:\\*\\*) \\[ \\] done`, "s");
  if (sectionRe.test(md)) {
    md = md.replace(sectionRe, "$1 [x] done");
    writeFileSync(SOCIAL_MD_PATH, md);
    console.log(`  [sync] Marked ${postId} done in SOCIAL_POSTS.md`);
  }
}

export { __dirname, ROOT, POSTED_PATH };

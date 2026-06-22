#!/usr/bin/env node
// Parses SOCIAL_POSTS.md → posts.json
// No external dependencies. Run: node build-manifest.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "SOCIAL_POSTS.md");
const OUT = resolve(__dirname, "posts.json");

const text = readFileSync(SRC, "utf8");
const lines = text.split("\n");

const posts = [];
let cur = null;
let mode = null; // "instagram" | "x" | null
let fence = false;

for (const raw of lines) {
  const line = raw.trimEnd();

  // Post heading: ### P1 — Title
  const hm = line.match(/^###\s+(P\d+|E\d+)\s+[—–-]+\s+(.+)/);
  if (hm) {
    if (cur) posts.push(cur);
    cur = { id: hm[1], type: hm[1].startsWith("P") ? "product" : "educational", title: hm[2].trim(), date: null, image: { file: null, exists: false, alt: null }, imageInstagram: null, instagram: "", x: "" };
    mode = null; fence = false;
    continue;
  }
  if (!cur) continue;

  // Meta lines
  const datM = line.match(/^\*\*Post date:\*\*\s+(.+)/);
  if (datM) { cur.date = datM[1].trim(); continue; }
  const igImgM = line.match(/^\*\*Image \(Instagram\):\*\*\s+`([^`]+)`/);
  if (igImgM) { cur.imageInstagram = igImgM[1].trim(); continue; }
  const imgM = line.match(/^\*\*Image:\*\*\s+`([^`]+)`/);
  if (imgM) { cur.image.file = imgM[1].trim(); cur.image.exists = existsSync(resolve(ROOT, imgM[1].trim())); continue; }
  const altM = line.match(/^\*\*Alt text:\*\*\s+(.+)/);
  if (altM) { cur.image.alt = altM[1].trim(); continue; }

  // Platform blocks
  if (line.match(/^\*\*Instagram\*\*/)) { mode = "instagram"; fence = false; continue; }
  if (line.match(/^\*\*X\*\*/)) { mode = "x"; fence = false; continue; }

  // Fenced code block toggle
  if (line.startsWith("```")) {
    if (!fence) { fence = true; }
    else { fence = false; mode = null; }
    continue;
  }

  if (fence && mode) {
    cur[mode] += (cur[mode] ? "\n" : "") + line;
  }
}
if (cur) posts.push(cur);

writeFileSync(OUT, JSON.stringify(posts, null, 2));
console.log(`Wrote ${posts.length} posts → posts.json`);

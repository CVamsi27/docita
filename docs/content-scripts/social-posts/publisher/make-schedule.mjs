#!/usr/bin/env node
// Reads posts.json → schedule.json + buffer-import.csv + CALENDAR.md
// Run: node make-schedule.mjs --start 2026-06-15
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ORDER = ["P1","P2","E1","P3","P4","E2","P5","P6","E3","P7","P8","E4","P9","P10","E5","P11","P12","E6","P13","P14","E7","P15","P16","E8","P17","P18","E9","P19"];
const X_TIME = "09:00", IG_TIME = "18:00";

const args = process.argv.slice(2);
const startArg = args[args.indexOf("--start") + 1] ?? "2026-06-15";
const startDate = new Date(`${startArg}T00:00:00+05:30`);

const posts = JSON.parse(readFileSync(resolve(__dirname, "posts.json"), "utf8"));
const byId = Object.fromEntries(posts.map(p => [p.id, p]));

const schedule = [];
const csvRows = ["Date,Time,Text,Image Path,Post Type,Profile"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

ORDER.forEach((id, i) => {
  const p = byId[id];
  if (!p) { console.warn(`Post ${id} not found in posts.json`); return; }
  const d = new Date(startDate);
  d.setDate(d.getDate() + i);
  const iso = d.toISOString().slice(0, 10);
  const imgFile = p.image.file ?? "";
  const imgPng = imgFile.replace("images/", "images-png/").replace(/\.svg$/, ".png");

  schedule.push({ ...p, scheduledDate: iso });

  // X row
  const xText = p.x.replace(/"/g, '""');
  csvRows.push(`${iso},${X_TIME},"${xText}","${imgPng}",Post,@docita_work (X)`);
  // IG row
  const igText = p.instagram.replace(/"/g, '""');
  csvRows.push(`${iso},${IG_TIME},"${igText}","${imgPng}",Post,@docita_work (Instagram)`);
});

writeFileSync(resolve(__dirname, "schedule.json"), JSON.stringify(schedule, null, 2));
writeFileSync(resolve(__dirname, "buffer-import.csv"), csvRows.join("\n"));
console.log(`Wrote schedule.json (${schedule.length} posts) + buffer-import.csv (${csvRows.length - 1} rows)`);

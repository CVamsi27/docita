#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse } from "smol-toml";

const { values } = parseArgs({
  options: { mode: { type: "string", default: "production" } },
  allowPositionals: false,
  strict: true,
});
const mode = values.mode;
if (mode !== "production" && mode !== "staging") {
  throw new Error("Cloudflare frontend mode must be production or staging.");
}

const root = process.cwd();
const config = parse(readFileSync(resolve(root, "wrangler.toml"), "utf8"));
const selected = config.env?.[mode]?.vars;
const production = config.env?.production?.vars;
if (!selected || !production || typeof selected !== "object") {
  throw new Error("Cloudflare frontend environment configuration is missing.");
}
if (Object.values(selected).some((value) => typeof value !== "string")) {
  throw new Error("Cloudflare frontend variables must be strings.");
}

function apiOrigin(value) {
  if (typeof value !== "string") {
    throw new Error("The configured API proxy target is missing.");
  }
  const url = new URL(value);
  if (url.protocol !== "https:" || value !== url.origin) {
    throw new Error("The configured API proxy target must be an HTTPS origin.");
  }
  return url.origin;
}

const selectedOrigin = apiOrigin(selected.API_PROXY_TARGET);
const productionOrigin = apiOrigin(production.API_PROXY_TARGET);
const sourceHeaders = readFileSync(resolve(root, "public/_headers"), "utf8");
const headers = sourceHeaders
  .replaceAll(productionOrigin, selectedOrigin)
  .replaceAll(
    productionOrigin.replace("https:", "wss:"),
    selectedOrigin.replace("https:", "wss:"),
  );

// Wrangler vars are authoritative for the selected release environment. In
// particular, an inherited production URL must not enter a staging bundle.
const result = spawnSync("pnpm", ["exec", "vite", "build", "--mode", mode], {
  cwd: root,
  env: { ...process.env, ...selected, NODE_ENV: "production" },
  stdio: "inherit",
});
if (result.error || result.status !== 0) {
  process.exit(result.status ?? 1);
}
writeFileSync(resolve(root, "dist/_headers"), headers);

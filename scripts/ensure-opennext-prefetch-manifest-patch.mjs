#!/usr/bin/env node

/**
 * Patch generated OpenNext Cloudflare handlers to gracefully handle
 * `.next/server/prefetch-hints.json` lookups in Workers runtime.
 *
 * Next 16 may call loadManifest for prefetch hints at runtime; the generated
 * OpenNext loader throws on unknown manifest paths. We inject a narrow fallback
 * that returns an empty object for prefetch hints only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultApps = ["landing", "app", "internal"];

const explicitAppArg = process.argv.find((arg) => arg.startsWith("--app="));
const appsToProcess = explicitAppArg
  ? [explicitAppArg.split("=")[1]].filter(Boolean)
  : defaultApps;

const throwNeedle = "throw new Error(`Unexpected loadManifest(${path2}) call!`)";
const patchNeedle =
  "if(path2.endsWith(\"/server/prefetch-hints.json\")||path2.endsWith(\"/server/subresource-integrity-manifest.json\")||path2.endsWith(\"/dynamic-css-manifest\"))return{};" +
  throwNeedle;

function patchHandler(app) {
  const candidateHandlerPaths = [
    path.join(
      rootDir,
      "apps",
      app,
      ".open-next",
      "server-functions",
      "default",
      "handler.mjs",
    ),
    path.join(
      rootDir,
      "apps",
      app,
      ".open-next",
      "server-functions",
      "default",
      "apps",
      app,
      "handler.mjs",
    ),
  ];

  const existingPaths = candidateHandlerPaths.filter((handlerPath) =>
    fs.existsSync(handlerPath),
  );
  if (existingPaths.length === 0) {
    console.log(
      `[skip] ${app}: no generated handler found at expected OpenNext paths`,
    );
    return;
  }

  let patchedCount = 0;
  let alreadyPatchedCount = 0;
  let missingNeedleCount = 0;

  for (const handlerPath of existingPaths) {
    const source = fs.readFileSync(handlerPath, "utf8");
    if (source.includes(patchNeedle)) {
      alreadyPatchedCount += 1;
      continue;
    }
    if (!source.includes(throwNeedle)) {
      missingNeedleCount += 1;
      continue;
    }

    const patched = source.replace(throwNeedle, patchNeedle);
    fs.writeFileSync(handlerPath, patched, "utf8");
    patchedCount += 1;
  }

  if (patchedCount > 0) {
    console.log(
      `[patched] ${app}: added prefetch-hints manifest fallback (${patchedCount} file(s))`,
    );
    return;
  }
  if (alreadyPatchedCount > 0) {
    console.log(`[ok] ${app}: prefetch fallback already present`);
    return;
  }

  console.log(
    `[warn] ${app}: expected loadManifest guard not found in ${missingNeedleCount} handler file(s)`,
  );
}

for (const app of appsToProcess) {
  patchHandler(app);
}

/**
 * Ensures packages/ui dist exists and is not older than workspace UI sources.
 * Avoids stale .d.ts when running `pnpm --filter @docita/app run check-types` without Turbo.
 *
 * Previously only compared tooltip.tsx to tooltip.d.ts; changes to other components (e.g.
 * command.tsx) could leave dist types stale and break app typecheck.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const uiSrcRoot = path.join(repoRoot, "packages", "ui", "src");
/** Representative output file; rebuilt with every `pnpm --filter @workspace/ui run build`. */
const distMarker = path.join(
  repoRoot,
  "packages",
  "ui",
  "dist",
  "components",
  "command.d.ts",
);

const SRC_EXTENSIONS = new Set([".ts", ".tsx"]);

function maxMtimeUnder(dir) {
  let max = 0;
  function walk(current) {
    if (!existsSync(current)) return;
    for (const ent of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name);
      if (!SRC_EXTENSIONS.has(ext)) continue;
      const m = statSync(full).mtimeMs;
      if (m > max) max = m;
    }
  }
  walk(dir);
  return max;
}

function needsUiBuild() {
  if (!existsSync(distMarker)) return true;
  if (!existsSync(uiSrcRoot)) return false;
  const latestSrc = maxMtimeUnder(uiSrcRoot);
  return latestSrc > statSync(distMarker).mtimeMs;
}

if (needsUiBuild()) {
  execSync("pnpm --filter @workspace/ui run build", {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

// Shared helpers for checks that validate `pnpm <script>` references against
// workspace manifests. Used by:
//   - scripts/checks/check-workflow-script-refs.mjs (.github/workflows run steps)
//   - scripts/checks/check-script-name-refs.mjs (manifest chains, git hooks, docs)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// pnpm built-in commands. When used WITHOUT an explicit `run` prefix these are
// not script invocations (e.g. `pnpm exec playwright`, `pnpm dlx knip`).
// Tradeoff: bare root `pnpm test`/`pnpm start` are skipped even though both
// are real root scripts here — conservative direction (no false positives).
export const PNPM_BUILTINS = new Set([
  "install",
  "i",
  "add",
  "audit",
  "remove",
  "rm",
  "update",
  "up",
  "dlx",
  "exec",
  "run",
  "start",
  "test",
  "help",
  "init",
  "create",
  "list",
  "ls",
  "why",
  "info",
  "view",
  "config",
  "env",
  "store",
  "pack",
  "publish",
  "rebuild",
  "prune",
  "link",
  "unlink",
  "patch",
  "patch-commit",
  "patch-remove",
  "dedupe",
  "fetch",
  "import",
  "export",
  "root",
  "bin",
  "server",
  "deploy",
  "recursive",
  "filter",
  "approve-builds",
  "setup",
  "wizard",
  "--version",
  "-v",
  "--help",
  "-h",
]);

/**
 * Load every workspace package manifest keyed by its package name.
 *
 * @param {string} root - repo root directory
 * @returns {Map<string, { scripts: Record<string, string>, path: string, dir: string }>}
 */
export function loadWorkspacePackages(root) {
  const map = new Map();
  let globs = ["apps/*", "packages/*"];
  try {
    const ws = readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
    const found = [...ws.matchAll(/^\s*-\s*"?([^"\n#]+?)"?\s*$/gm)]
      .map((m) => m[1].trim())
      .filter((g) => g.includes("*") || g.endsWith("/"));
    if (found.length > 0) globs = found;
  } catch {
    // Fall back to the conventional layout.
  }
  for (const glob of globs) {
    const base = glob.replace(/\*+$/, "").replace(/\/+$/, "");
    let entries = [];
    try {
      entries = readdirSync(path.join(root, base), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = path.join(root, base, entry.name, "package.json");
      if (!existsSync(pkgPath)) continue;
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (typeof pkg.name === "string" && pkg.name.length > 0) {
          map.set(pkg.name, {
            scripts: pkg.scripts ?? {},
            path: pkgPath,
            dir: path.dirname(pkgPath),
          });
        }
      } catch {
        // Invalid manifest; leave it out and let a later check surface it.
      }
    }
  }
  return map;
}

/**
 * @param {string} root - repo root directory
 * @returns {Record<string, string>} root package.json scripts
 */
export function loadRootScripts(root) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * Extract `pnpm` script invocations from a single command string.
 * Stops each match at shell operators (`&&`, `;`, `|`, `>`, `<`). Leading
 * pnpm flags (`-w`, `--offline`, ...) are consumed before the optional `run`
 * keyword so `pnpm -w run build` resolves `build`, not `-w`.
 *
 * @param {string} command
 * @returns {{ filter: string | null, explicitRun: boolean, script: string }[]}
 */
export function parsePnpmInvocations(command) {
  const runs = [];
  const re =
    /(?:^|[\s&;|(])(pnpm)(?:\s+(?:--filter(?:\s+|=)([^\s]+)|-F\s+([^\s]+)))?\s+((?:-{1,2}[^\s&|;<>]+\s+)*)(?:(run)\s+)?([^\s&|;<>"'`,]+)/g;
  for (const m of command.matchAll(re)) {
    const [, , filter, filterShort, , runFlag, script] = m;
    if (!script) continue;
    runs.push({
      filter: filter ?? filterShort ?? null,
      explicitRun: Boolean(runFlag),
      script,
    });
  }
  return runs;
}

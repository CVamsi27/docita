import { blankJsComments } from "./check-runner.mjs";
import {
  listTrackedFiles,
  readText,
} from "./structure-audit-file-system.mjs";
import { hasImportFrom } from "./structure-audit-imports.mjs";

export function collectPackageBoundaryFindings() {
  const files = listTrackedFiles().filter((file) =>
    /^packages\/(utils|ui|types|data-access|hooks|auth)\//.test(file),
  );
  const issues = [];

  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) continue;
    const content = readText(file);
    // Comments are blanked before the regex rules run. A presentational
    // component documenting *where* its data hook lives has to name the
    // package, and that prose was reported as a dependency:
    // `server-warming-screen.tsx` says "the availability hook lives in
    // @workspace/data-access" in a doc block and imports only `Button` and
    // `PageTransitionLoader`. Offsets and line numbers are preserved, so
    // findings still point at the right line.
    const code = blankJsComments(content);

    if (file.startsWith("packages/utils/") && hasImportFrom(code, [/from\s+["']react["']/, /from\s+["']next\//])) {
      issues.push({
        file,
        severity: "move",
        message: "packages/utils must remain framework-agnostic",
      });
    }

    // The package dependencies are matched as imports rather than as a bare
    // substring: only an actual `from "@workspace/data-access"` binds a
    // presentational package to data access, and scoping it that way makes the
    // rule immune to prose without relying on comment blanking alone.
    if (
      file.startsWith("packages/ui/") &&
      (hasImportFrom(code, [
        /from\s+["'][^"']*@workspace\/data-access/,
        /from\s+["']@tanstack\/react-query/,
      ]) ||
        /\bfetch\s*\(/.test(code))
    ) {
      issues.push({
        file,
        severity: "move",
        message: "packages/ui must not fetch data or depend on data-access",
      });
    }

    if (file.startsWith("packages/types/") && /@workspace\/db|@prisma\/client/.test(code)) {
      issues.push({
        file,
        severity: "move",
        message: "packages/types must be DB-agnostic",
      });
    }
  }

  return issues;
}

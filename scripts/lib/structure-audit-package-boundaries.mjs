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

    if (file.startsWith("packages/utils/") && hasImportFrom(content, [/from\s+["']react["']/, /from\s+["']next\//])) {
      issues.push({
        file,
        severity: "move",
        message: "packages/utils must remain framework-agnostic",
      });
    }

    if (file.startsWith("packages/ui/") && /\bfetch\s*\(|@tanstack\/react-query|@workspace\/data-access/.test(content)) {
      issues.push({
        file,
        severity: "move",
        message: "packages/ui must not fetch data or depend on data-access",
      });
    }

    if (file.startsWith("packages/types/") && /@workspace\/db|@prisma\/client/.test(content)) {
      issues.push({
        file,
        severity: "move",
        message: "packages/types must be DB-agnostic",
      });
    }
  }

  return issues;
}

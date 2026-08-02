import {
  listTrackedFiles,
  readText,
} from "./structure-audit-file-system.mjs";

export function collectFeatureBoundaryFindings() {
  const files = listTrackedFiles().filter((file) =>
    /^apps\/(app-vite|internal-vite)\/src\/features\/[^/]+\/.*\.(ts|tsx)$/.test(
      file,
    ),
  );
  const issues = [];
  const importPattern = /from\s+["']([^"']+)["']/g;

  for (const file of files) {
    const content = readText(file);
    const match = file.match(
      /^apps\/(app-vite|internal-vite)\/src\/features\/([^/]+)\//,
    );
    const currentFeature = match?.[2];
    if (!currentFeature) continue;

    for (const importMatch of content.matchAll(importPattern)) {
      const specifier = importMatch[1];
      if (!specifier.startsWith("@/features/")) continue;

      const parts = specifier.split("/");
      const importedFeature = parts[2];
      const importsFeatureInternal = parts.length > 3;

      if (
        importedFeature &&
        importsFeatureInternal &&
        importedFeature !== currentFeature &&
        importedFeature !== "_shared"
      ) {
        issues.push({
          file,
          severity: "review",
          message: `feature imports another feature internals (${importMatch[0]}); prefer package export or _shared`,
        });
      }
    }
  }

  return issues;
}

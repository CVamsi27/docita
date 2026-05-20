import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const FACADE_HEADER_PATTERN =
  /thin facade|facade —|facade for|facade that (delegates|preserves)|real logic lives in/i;

const FACADE_GLOB_PATHS = [
  "apps/api/src/domains/*/application/services/*.service.ts",
  "apps/api/src/shared/modules/**/*.service.ts",
];

/**
 * Service class names whose source documents delegation to command/query layers.
 */
export function loadDocumentedFacadeServiceNames() {
  const names = new Set();
  const files = FACADE_GLOB_PATHS.flatMap((glob) =>
    execSync(`git ls-files '${glob}'`, { encoding: "utf8" })
      .split("\n")
      .filter(Boolean),
  );

  for (const file of files) {
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    if (!FACADE_HEADER_PATTERN.test(source)) continue;
    const match = source.match(/export class (\w+)/);
    if (match) {
      names.add(match[1]);
    }
  }

  return names;
}

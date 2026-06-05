import { execSync } from "child_process";
import { existsSync } from "fs";

const SOURCE_RE = /\.(ts|tsx)$/;
const TEST_RE = /\.(spec|test)\.[tj]sx?$/;

export function listSourceFiles(roots) {
  return roots
    .flatMap((root) =>
      execSync(`git ls-files '${root}'`, { encoding: "utf8" })
        .split("\n")
        .filter(Boolean),
    )
    .filter((file) => SOURCE_RE.test(file))
    .filter((file) => !TEST_RE.test(file))
    .filter((file) => existsSync(file));
}

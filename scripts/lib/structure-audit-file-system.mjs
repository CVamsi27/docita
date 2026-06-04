import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

export function listTrackedFiles() {
  return execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

export function readText(file) {
  try {
    return fs.readFileSync(path.join(repoRoot, file), "utf8");
  } catch {
    return "";
  }
}

export function writeFile(relativePath, content) {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${content.trim()}\n`, "utf8");
}

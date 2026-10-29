import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

/** No local paths, Git remotes, credentials or raw diffs are retained. */
export function sourceProvenance() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const revision = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  const status = spawnSync("git", ["-C", root, "status", "--porcelain"], {
    encoding: "utf8",
  });
  const diff = spawnSync("git", ["-C", root, "diff", "--binary", "HEAD"], {
    maxBuffer: 20_000_000,
  });
  const hash = createHash("sha256");
  for (const name of [
    "model.mjs",
    "safety.mjs",
    "observation.mjs",
    "runner.mjs",
    "provenance.mjs",
    "capacity.mjs",
  ]) {
    try {
      hash.update(name).update(readFileSync(new URL(name, import.meta.url)));
    } catch {
      hash.update("unavailable");
    }
  }
  return {
    revision:
      revision.status === 0 && /^[a-f0-9]{40}$/.test(revision.stdout.trim())
        ? revision.stdout.trim()
        : null,
    workingTreeDirty:
      status.status === 0 ? Boolean(status.stdout.trim()) : null,
    trackedDiffSha256:
      diff.status === 0
        ? createHash("sha256").update(diff.stdout).digest("hex")
        : null,
    harnessSha256: hash.digest("hex"),
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    sourceBoundary:
      "Revision, tracked-diff hash and harness hash; retain a reviewed source snapshot for untracked application changes.",
  };
}

export function resourceDeclaration(values = {}) {
  const fields = [
    "apiVcpus",
    "apiMemoryMiB",
    "apiReplicas",
    "workerVcpus",
    "workerMemoryMiB",
    "workerReplicas",
    "dbVcpus",
    "dbMemoryMiB",
    "dbStorageGiB",
  ];
  if (
    !values ||
    typeof values !== "object" ||
    Array.isArray(values) ||
    Object.keys(values).some((key) => !fields.includes(key))
  ) {
    throw new Error("Resources must contain only documented numeric fields.");
  }
  const result = { provenance: "operator-declared-not-observed" };
  for (const field of fields) {
    const value = values[field];
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < 0 || value > 10_000_000)
    )
      throw new Error("Resource values must be finite nonnegative numbers.");
    result[field] = value ?? null;
  }
  return result;
}

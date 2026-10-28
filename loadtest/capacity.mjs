#!/usr/bin/env node
import { openSync, writeFileSync, closeSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runCapacity } from "./runner.mjs";
import { loadCredentials } from "./safety.mjs";

const numeric = new Map([
  ["--duration-seconds", "durationSeconds"],
  ["--max-in-flight", "maxInFlight"],
  ["--timeout-ms", "timeoutMs"],
  ["--drain-timeout-ms", "drainTimeoutMs"],
  ["--max-lag-ms", "maxLagMs"],
  ["--max-requests", "maxRequests"],
  ["--max-response-bytes", "maxResponseBytes"],
]);
function options(args) {
  const parsed = { planOptions: {}, dryRun: false, confirmed: false };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error("Duplicate option rejected.");
    seen.add(flag);
    if (flag === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (flag === "--confirm-isolated-local") {
      parsed.confirmed = true;
      continue;
    }
    const value = args[++index];
    if (typeof value !== "string" || value.startsWith("--"))
      throw new Error("A documented option value is required.");
    if (numeric.has(flag))
      parsed.planOptions[numeric.get(flag)] = Number(value);
    else if (flag === "--phase") parsed.planOptions.phase = value;
    else if (flag === "--reference-date")
      parsed.planOptions.referenceDate = value;
    else if (flag === "--temperature") parsed.planOptions.temperature = value;
    else if (flag === "--base-url") parsed.baseUrl = value;
    else if (flag === "--credentials") parsed.credentialsFile = value;
    else if (flag === "--output") parsed.outputFile = value;
    else if (flag === "--resources") parsed.resourcesFile = value;
    else
      throw new Error(
        "Unknown option; use the options documented in loadtest/README.md.",
      );
  }
  return parsed;
}

try {
  const config = options(process.argv.slice(2));
  if (
    !config.dryRun &&
    (!config.confirmed || !config.credentialsFile || !config.outputFile)
  ) {
    throw new Error(
      "Real capture requires --confirm-isolated-local, --credentials and --output.",
    );
  }
  // Plan validation and dry-run happen before reading any credential file.
  const plan = await runCapacity({
    baseUrl: config.baseUrl,
    dryRun: true,
    planOptions: config.planOptions,
  });
  if (config.dryRun) {
    process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
  } else {
    let resources = {};
    if (config.resourcesFile) {
      try {
        resources = JSON.parse(readFileSync(config.resourcesFile, "utf8"));
      } catch {
        throw new Error(
          "Resource declaration must be readable JSON with documented numeric fields.",
        );
      }
    }
    const credentials = loadCredentials(config.credentialsFile);
    const document = {
      version: 1,
      environment: "isolated-local",
      tenants: credentials,
    };
    // Reserve a fresh private file before any request; never overwrite a previous result or follow a symlink.
    let descriptor;
    try {
      descriptor = openSync(config.outputFile, "wx", 0o600);
    } catch {
      throw new Error(
        "Output must be a new writable file; existing files and symlinks are rejected.",
      );
    }
    try {
      const artifact = await runCapacity({
        baseUrl: config.baseUrl,
        credentials: document,
        planOptions: config.planOptions,
        resources,
      });
      const bytes = JSON.stringify(artifact, null, 2) + "\n";
      writeFileSync(descriptor, bytes);
      process.stdout.write(
        JSON.stringify({
          complete: artifact.complete,
          evidenceKind: artifact.evidenceKind,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          summary: artifact.summary,
        }) + "\n",
      );
      if (!artifact.complete) process.exitCode = 1;
    } finally {
      closeSync(descriptor);
    }
  }
} catch (error) {
  // All emitted validation errors are authored here/in guards; never print raw input, DB URLs or filesystem errors.
  const message =
    error instanceof Error && !/(ENOENT|EACCES|\bat\s|\n)/.test(error.message)
      ? error.message
      : "Capacity capture failed; inspect local setup without publishing credentials.";
  process.stderr.write(message + "\n");
  process.exitCode = 1;
}

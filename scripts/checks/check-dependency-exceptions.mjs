#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, TomlDate } from "smol-toml";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function checkDependencyExceptions({
  root = process.cwd(),
  now = new Date(),
} = {}) {
  const findings = [];
  let manifest;
  let config;
  try {
    manifest = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    );
  } catch {
    return ["invalid package.json; cannot verify dependency exceptions"];
  }
  try {
    config = parse(readFileSync(path.join(root, "osv-scanner.toml"), "utf8"), {
      unsafeKeyBehaviour: "throw",
    });
  } catch {
    return ["invalid osv-scanner.toml; cannot verify dependency exceptions"];
  }
  if (!isRecord(manifest)) return ["package.json must be an object"];
  const auditConfig = manifest.pnpm?.auditConfig ?? {};
  if (!isRecord(auditConfig)) return ["pnpm auditConfig must be an object"];
  const pnpmIgnores = new Set();
  for (const key of ["ignoreGhsas", "ignoreCves"]) {
    const ids = auditConfig[key] ?? [];
    if (
      !Array.isArray(ids) ||
      ids.some((id) => typeof id !== "string" || !id.trim())
    ) {
      findings.push(`pnpm auditConfig.${key} must be an array of advisory IDs`);
      continue;
    }
    for (const id of ids) {
      if (pnpmIgnores.has(id)) findings.push(`${id}: duplicate pnpm ignore`);
      pnpmIgnores.add(id);
    }
  }
  const exceptions = config.IgnoredVulns ?? [];
  if (!Array.isArray(exceptions)) return ["OSV IgnoredVulns must be an array"];
  const osvIgnores = new Set();
  for (const exception of exceptions) {
    if (
      !isRecord(exception) ||
      typeof exception.id !== "string" ||
      !exception.id.trim()
    ) {
      findings.push("Every OSV exception requires an advisory id");
      continue;
    }
    const { id, ignoreUntil, reason } = exception;
    if (osvIgnores.has(id)) findings.push(`${id}: duplicate OSV ignore`);
    osvIgnores.add(id);
    if (!pnpmIgnores.has(id))
      findings.push(`${id}: missing from pnpm auditConfig`);
    if (
      !(ignoreUntil instanceof TomlDate) ||
      !ignoreUntil.isDate() ||
      !ignoreUntil.isValid()
    ) {
      findings.push(`${id}: ignoreUntil must be a TOML date (YYYY-MM-DD)`);
    } else if (now.getTime() >= ignoreUntil.getTime()) {
      findings.push(
        `${id}: exception expired on ${ignoreUntil.toISOString()}; remove both scanner ignores`,
      );
    }
    if (typeof reason !== "string" || !reason.trim())
      findings.push(`${id}: reason is required`);
  }
  for (const id of pnpmIgnores) {
    if (!osvIgnores.has(id))
      findings.push(`${id}: missing from osv-scanner.toml`);
  }
  return findings;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const findings = checkDependencyExceptions();
  if (findings.length) {
    process.stderr.write(
      `Dependency exception check failed:\n${findings.join("\n")}\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Dependency exception check passed.\n");
  }
}

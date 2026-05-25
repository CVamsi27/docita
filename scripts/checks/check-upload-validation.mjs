#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");

const files = execSync("git ls-files apps/api/src", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.controller\.ts$/.test(file));

function resolveImportToPath(importSpecifier, fromFile) {
  let resolved;
  if (
    importSpecifier.startsWith("./") ||
    importSpecifier.startsWith("../")
  ) {
    resolved = path.normalize(
      path.join(path.dirname(path.join(repoRoot, fromFile)), importSpecifier),
    );
  } else if (importSpecifier.startsWith("@/")) {
    resolved = path.join(
      repoRoot,
      "apps/api/src",
      importSpecifier.slice(2),
    );
  } else {
    return null;
  }

  if (!resolved.endsWith(".ts")) {
    resolved = `${resolved}.ts`;
  }
  return fs.existsSync(resolved) ? resolved : null;
}

/** Controller + companion *.upload.ts modules (split upload Multer options). */
function collectUploadSources(file) {
  const absolutePath = path.join(repoRoot, file);
  const source = fs.readFileSync(absolutePath, "utf8");
  const parts = [source];

  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = match[1];
    if (!/\.upload$/.test(spec)) {
      continue;
    }
    const companion = resolveImportToPath(spec, file);
    if (companion) {
      parts.push(fs.readFileSync(companion, "utf8"));
    }
  }

  return parts.join("\n");
}

const findings = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const source = fs.readFileSync(absolutePath, "utf8");
  const isUploadBoundary = /\bFileInterceptor\s*\(/.test(source);
  if (!isUploadBoundary) continue;

  const combined = collectUploadSources(file);

  const validatesMime =
    /\b(fileFilter|allowedMimes|mimetype|contentType|allowedTypes|allowedMime|fileType)\b/i.test(
      combined,
    );
  const validatesSize = /\b(fileSize|MAX_FILE_SIZE|maxSize|maxBytes)\b/i.test(
    combined,
  );
  const validatesSignature =
    /\bassertAllowed(File|ImportFile)Signature\b/.test(combined);
  const sanitizesName =
    /\b(createTempDiskStorage|sanitize|safeFileName|basename|normalizeUploadFileName|null byte|\.\.)\b/i.test(
      combined,
    );

  if (
    !validatesMime ||
    !validatesSize ||
    !validatesSignature ||
    !sanitizesName
  ) {
    findings.push({
      file,
      reason: [
        !validatesMime ? "mime/content-type validation" : null,
        !validatesSize ? "size validation" : null,
        !validatesSignature ? "content signature validation" : null,
        !sanitizesName ? "filename sanitization" : null,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Upload validation check failed.\n"
      : "Upload validation report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding.file}: missing ${finding.reason}`);
  }
  if (enforce) process.exit(1);
  console.log(
    `Upload validation reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Upload validation check passed.");

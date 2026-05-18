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

const findings = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const source = fs.readFileSync(absolutePath, "utf8");
  const isUploadBoundary = /\bFileInterceptor\s*\(/.test(source);
  if (!isUploadBoundary) continue;

  const validatesMime =
    /\b(fileFilter|allowedMimes|mimetype|contentType|allowedTypes|allowedMime|fileType)\b/i.test(
      source,
    );
  const validatesSize = /\b(fileSize|MAX_FILE_SIZE|maxSize|maxBytes)\b/i.test(
    source,
  );
  const validatesSignature = /\bassertAllowedFileSignature\b/.test(source);
  const sanitizesName =
    /\b(createTempDiskStorage|sanitize|safeFileName|basename|normalizeUploadFileName|null byte|\.\.)\b/i.test(
      source,
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

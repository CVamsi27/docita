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
  .filter((file) => /webhook/i.test(file) && /\.controller\.ts$/.test(file));

const findings = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const source = fs.readFileSync(absolutePath, "utf8");
  const hasPublicPost = /@Public\(\)[\s\S]{0,400}@Post\(/.test(source);
  if (!hasPublicPost) continue;

  const verifiesSignature =
    /\b(webhookVerifier\.verify|verifySignature|verifyHmac|validateSignature|verifyZeptoMailWebhookIngress|x-hub-signature|x-razorpay-signature)\b/.test(
      source,
    );
  const usesRawBody = /\brawBody\b/.test(source);

  if (!verifiesSignature || !usesRawBody) {
    findings.push({
      file,
      reason: `${verifiesSignature ? "" : "missing signature verifier"}${
        !verifiesSignature && !usesRawBody ? "; " : ""
      }${usesRawBody ? "" : "missing rawBody verification input"}`,
    });
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Webhook signature check failed.\n"
      : "Webhook signature report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.reason}`);
  }
  if (enforce) process.exit(1);
  process.exit(0);
}

console.log("Webhook signature check passed.");

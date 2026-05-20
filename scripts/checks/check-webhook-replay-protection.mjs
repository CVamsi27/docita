#!/usr/bin/env node

/**
 * Webhook POST handlers must use WebhookVerifierService replay dedupe or
 * RequiresIdempotency (client-initiated idempotency keys).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const files = execSync("git ls-files apps/api/src", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /webhook/i.test(file) && /\.controller\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => existsSync(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (!/@Public\(\)/.test(source) || !/@Post\(/.test(source)) {
    continue;
  }

  const hasReplayProtection =
    /webhookVerifier\.verify\s*\(/.test(source) ||
    /assertVerifiedRazorpayWebhook\s*\(/.test(source) ||
    (/RequiresIdempotency/.test(source) &&
      /IdempotencyInterceptor/.test(source));

  if (!hasReplayProtection) {
    findings.push(
      `${file}: public webhook POST missing WebhookVerifierService.verify replay protection`,
    );
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Webhook replay protection check failed. Use WebhookVerifierService.verify (replay dedupe) or RequiresIdempotency + IdempotencyInterceptor.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Webhook replay protection check passed.\n");

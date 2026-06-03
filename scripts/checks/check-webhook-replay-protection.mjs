#!/usr/bin/env node

/**
 * Webhook POST handlers must use WebhookVerifierService replay dedupe or
 * RequiresIdempotency (client-initiated idempotency keys).
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import { listSourceFiles } from "../lib/list-source-files.mjs";

const files = listSourceFiles(["apps/api/src"])
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => /webhook/i.test(file) && /\.controller\.ts$/.test(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (!/@Public\(\)/.test(source) || !/@Post\(/.test(source)) {
    continue;
  }

  const hasReplayProtection =
    /webhookVerifier\.verify\s*\(/.test(source) ||
    /assertVerifiedRazorpayWebhook\s*\(/.test(source) ||
    /verifyZeptoMailWebhookIngress\s*\(/.test(source) ||
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

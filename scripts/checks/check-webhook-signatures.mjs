#!/usr/bin/env node

import fs from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const files = gitLsSourceFiles(["apps/api/src"], {
  include: [/webhook/i],
  exclude: [/\.(spec|test)\.[tj]sx?$/],
}).filter((file) => /\.controller\.ts$/.test(file));

const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const hasPublicPost = /@Public\(\)[\s\S]{0,400}@Post\(/.test(source);
  if (!hasPublicPost) continue;

  const verifiesSignature =
    /\b(webhookVerifier\.verify|verifySignature|verifyHmac|validateSignature|verifyZeptoMailWebhookIngress|x-hub-signature|x-razorpay-signature)\b/.test(
      source,
    );
  const usesRawBody = /\brawBody\b/.test(source);

  if (!verifiesSignature || !usesRawBody) {
    const reason = `${verifiesSignature ? "" : "missing signature verifier"}${
      !verifiesSignature && !usesRawBody ? "; " : ""
    }${usesRawBody ? "" : "missing rawBody verification input"}`;
    findings.push(`${file}: ${reason}`);
  }
}

reportFindingsAndExit("Webhook signature check", findings);

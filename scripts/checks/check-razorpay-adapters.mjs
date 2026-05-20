#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const FORBIDDEN_PATHS = [
  "apps/api/src/gateways/razorpay-subscription.gateway.ts",
  "apps/api/src/gateways/payment-gateway.interface.ts",
  "apps/api/src/websockets/razorpay-subscription.gateway.ts",
  "apps/api/src/websockets/payment-gateway.interface.ts",
  "apps/api/src/domains/subscriptions/infrastructure/gateways/razorpay.gateway.ts",
  "apps/api/src/domains/billing/infrastructure/providers/razorpay.provider.ts",
];

const FORBIDDEN_FRAGMENTS = [
  "gateways/razorpay-subscription",
  "websockets/razorpay-subscription",
  "subscriptions/infrastructure/gateways/razorpay",
  "billing/infrastructure/providers/razorpay.provider",
];

const REQUIRED_CANONICAL =
  "apps/api/src/domains/payments/infrastructure/adapters/razorpay/razorpay-client.service.ts";

const files = execSync("git ls-files apps/api", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.tsx?$/.test(file));

const findings = [];

for (const path of FORBIDDEN_PATHS) {
  if (existsSync(path)) {
    findings.push(`${path}: legacy Razorpay adapter path must not exist`);
  }
}

if (!existsSync(REQUIRED_CANONICAL)) {
  findings.push(`Missing canonical Razorpay client at ${REQUIRED_CANONICAL}`);
}

for (const file of files) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    if (source.includes(fragment)) {
      findings.push(`${file}: references forbidden Razorpay path \`${fragment}\``);
    }
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Razorpay adapter consolidation check failed.\n"
      : "Razorpay adapter consolidation report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Razorpay adapter consolidation check passed.");

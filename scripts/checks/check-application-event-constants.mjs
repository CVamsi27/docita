#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const EXCLUDED_FILES = new Set([
  "apps/api/src/shared/common/events/event.service.ts",
  "apps/api/src/gateways/notifications.gateway.ts",
  "apps/api/src/gateways/payment.websocket.gateway.ts",
]);

const STRING_EMIT = /eventEmitter\.emit\s*\(\s*['"]([^'"]+)['"]/g;
const STRING_ON_EVENT = /@OnEvent\s*\(\s*['"]([^'"]+)['"]/g;

const files = execSync("git ls-files apps/api/src", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => !file.includes("/gateways/"))
  .filter((file) => !EXCLUDED_FILES.has(file));

const findings = [];

for (const file of files) {
  if (!existsSync(file)) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  if (
    !source.includes("eventEmitter.emit") &&
    !source.includes("@OnEvent(")
  ) {
    continue;
  }

  for (const pattern of [STRING_EMIT, STRING_ON_EVENT]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const eventName = match[1];
      if (eventName === "domain.*" || eventName.endsWith(".*")) {
        continue;
      }
      findings.push(
        `${file}: use ApplicationEvents or DomainEvents instead of '${eventName}'`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Application event constants check failed.\n"
      : "Application event constants report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Application event constants check passed.");

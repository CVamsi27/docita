#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const routeDecorator = /^\s*@(Get|Post|Put|Patch|Delete|All)\b/;
const authDecorator =
  /^\s*@(Public|Roles|RequireFeature|RequireFeatureFlag|UseGuards|SkipSubscriptionCheck)\b/;
/** Composite *Access() decorators apply Roles/Guards via applyDecorators. */
const classPosturePattern =
  /@(Roles|Public|UseGuards)\b|@\w+Access\s*\(/;
const classLine = /^\s*export\s+class\s+\w+Controller\b/;

const files = execSync("git ls-files apps/api/src", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file.endsWith(".controller.ts"));

const violations = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
  let classHasAuth = false;
  const decoratorBuffer = [];
  const classHeaderBuffer = [];

  lines.forEach((line, index) => {
    if (/^\s*@/.test(line)) {
      decoratorBuffer.push(line);
      classHeaderBuffer.push(line);
      return;
    }

    if (classHeaderBuffer.length > 0 && !classLine.test(line)) {
      classHeaderBuffer.push(line);
    }

    if (classLine.test(line)) {
      classHasAuth = classPosturePattern.test(classHeaderBuffer.join("\n"));
      decoratorBuffer.length = 0;
      classHeaderBuffer.length = 0;
      return;
    }

    if (routeDecorator.test(decoratorBuffer.at(-1) ?? "")) {
      const methodHasAuth = decoratorBuffer.some((decorator) =>
        authDecorator.test(decorator),
      );
      if (!classHasAuth && !methodHasAuth) {
        violations.push({
          file,
          line: index + 1,
          route: decoratorBuffer.find((decorator) =>
            routeDecorator.test(decorator),
          ),
        });
      }
    }

    if (line.trim() !== "") {
      decoratorBuffer.length = 0;
    }
  });
}

if (violations.length > 0) {
  console.error("Controller RBAC posture check failed.\n");
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.route?.trim() ?? "route handler"} lacks controller or method auth posture`,
    );
  }
  process.exit(1);
}

console.log("Controller RBAC posture check passed.");

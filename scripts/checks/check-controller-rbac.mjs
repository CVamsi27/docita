#!/usr/bin/env node

import fs from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const routeDecorator = /^\s*@(Get|Post|Put|Patch|Delete|All)\b/;
const authDecorator =
  /^\s*@(Public|Roles|RequireFeature|RequireFeatureFlag|UseGuards|SkipSubscriptionCheck)\b/;
const classPosturePattern = /@(Roles|Public|UseGuards)\b|@\w+Access\s*\(/;
const classLine = /^\s*export\s+class\s+\w+Controller\b/;

const files = gitLsSourceFiles(["apps/api/src"], {
  include: [/\.controller\.ts$/],
});

const violations = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
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
        const route = decoratorBuffer.find((decorator) =>
          routeDecorator.test(decorator),
        );
        violations.push(
          `${file}:${index + 1} ${route?.trim() ?? "route handler"} lacks controller or method auth posture`,
        );
      }
    }

    if (line.trim() !== "") {
      decoratorBuffer.length = 0;
    }
  });
}

reportFindingsAndExit("Controller RBAC posture check", violations, {
  failAlways: true,
});

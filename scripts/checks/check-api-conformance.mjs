#!/usr/bin/env node
/**
 * API route conformance check — docs/architecture/API_DESIGN_STANDARD.md.
 *
 * Two mechanical violation classes, both named as gate failures by the
 * standard:
 *
 * 1. [route-prefix] §1 — a `@Controller(...)` path must never embed the
 *    `api` or `v1` segments. The versioned root is composed once globally in
 *    `apps/api/src/main.ts` (`setGlobalPrefix('api')` + URI versioning), so an
 *    embedded segment produces the double-prefix bug class
 *    (old `@Controller('api/v1/operations/database')` resolved to
 *    `/api/v1/api/v1/...` and never matched the client). Zero tolerance — no
 *    allowlist.
 *
 * 2. [action-post-status] §5 — a `@Post` handler that documents a 200
 *    response (`@ApiResponse({ status: 200 })`) but does not declare
 *    `@HttpCode(200)` returns Nest's default 201 on the wire while the docs
 *    say 200. Action POSTs (send / verify / cancel / transition / clear /
 *    backup) MUST carry `@HttpCode(HttpStatus.OK)`.
 *
 * The action-post class carries a tracked allowlist of the violations found
 * in the 2026-08-08 conformance audit (17 handlers). Fix each by adding
 * `@HttpCode(HttpStatus.OK)`, then delete its entry. The route-prefix class
 * fails immediately on any new occurrence.
 */

import fs from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

/**
 * Known §5 action-POST violations (audit 2026-08-08; see
 * docs/architecture/API_DESIGN_STANDARD.md §5). Key: `<file>|<route>`.
 * Each entry is fixed by adding `@HttpCode(HttpStatus.OK)` to the handler and
 * then removing the entry — the allowlist must never grow.
 */
const ACTION_POST_ALLOWLIST = new Set([
  "apps/api/src/domains/patient-portal/presentation/controllers/patient-portal-auth.controller.ts|request-otp",
  "apps/api/src/domains/patient-portal/presentation/controllers/patient-portal-auth.controller.ts|verify-otp",
  "apps/api/src/shared/common/controllers/database-operations.controller.ts|backup/full",
  "apps/api/src/shared/common/controllers/database-operations.controller.ts|backup/schema",
  "apps/api/src/shared/common/controllers/database-operations.controller.ts|backups/cleanup",
  "apps/api/src/shared/common/controllers/database-operations.controller.ts|backup/verify",
  "apps/api/src/shared/common/controllers/database-operations.controller.ts|slow-queries/clear",
  "apps/api/src/shared/modules/auth/auth/auth-login.controller.ts|login",
  "apps/api/src/shared/modules/auth/auth/auth-login.controller.ts|mfa/verify",
  "apps/api/src/shared/modules/auth/auth/auth-password.controller.ts|forgot-password",
  "apps/api/src/shared/modules/auth/auth/auth-password.controller.ts|reset-password",
  "apps/api/src/shared/modules/auth/auth/auth-password.controller.ts|change-password",
  "apps/api/src/shared/modules/auth/auth/auth-registration.controller.ts|check-email",
  "apps/api/src/shared/modules/auth/auth/auth-session.controller.ts|refresh",
  "apps/api/src/shared/modules/auth/auth/auth-session.controller.ts|logout",
  "apps/api/src/shared/modules/auth/auth/auth-verification.controller.ts|verify-email",
  "apps/api/src/shared/modules/auth/auth/auth-verification.controller.ts|resend-verification",
]);

/**
 * Ratchet ceiling for the action-post allowlist. The list is a shrinking
 * ratchet, not an escape hatch: adding a new violation to it (instead of
 * fixing the handler) fails the check. Bump this ONLY when the ceiling itself
 * is the tracked baseline (see check-jsx-literal-density baselines).
 */
const ACTION_POST_ALLOWLIST_CEILING = 17;

const controllerDecorator = /^\s*@Controller\s*\(/;
const postDecorator = /^\s*@Post\s*\(([^)]*)\)/;
const methodSignature = /^\s*(?:public\s+|private\s+)?(?:async\s+)?\w+\s*\(/;

function parenBalance(text) {
  let balance = 0;
  for (const char of text) {
    if (char === "(") balance += 1;
    else if (char === ")") balance -= 1;
  }
  return balance;
}

function quotedPathStrings(block) {
  const paths = [];
  for (const match of block.matchAll(/['"]([^'"]+)['"]/g)) {
    paths.push(match[1]);
  }
  return paths;
}

const files = gitLsSourceFiles(["apps/api/src"], {
  include: [/\.controller\.ts$/],
  exclude: [/\.(spec|e2e-spec)\.ts$/],
});

const findings = [];

if (ACTION_POST_ALLOWLIST.size > ACTION_POST_ALLOWLIST_CEILING) {
  findings.push(
    `[allowlist-ratchet] ACTION_POST_ALLOWLIST has ${ACTION_POST_ALLOWLIST.size} entries (ceiling ${ACTION_POST_ALLOWLIST_CEILING}) — fix the added handlers with @HttpCode(HttpStatus.OK) and remove their entries; the allowlist must only shrink`,
  );
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Embedded api/v1 prefix (§1) — zero tolerance.
    if (controllerDecorator.test(line)) {
      let block = line;
      let balance = parenBalance(line);
      let j = i + 1;
      while (balance > 0 && j < lines.length) {
        block += `\n${lines[j]}`;
        balance += parenBalance(lines[j]);
        j += 1;
      }
      for (const path of quotedPathStrings(block)) {
        const segments = path.split("/").map((s) => s.toLowerCase());
        if (segments.some((s) => s === "api" || s === "v1")) {
          findings.push(
            `[route-prefix] ${file}:${i + 1} @Controller('${path}') embeds the api/v1 root — main.ts composes it globally`,
          );
        }
      }
    }

    // 2. Action POST documented 200 without @HttpCode (§5) — allowlisted.
    const postMatch = postDecorator.exec(line);
    if (postMatch) {
      const route = postMatch[1].trim().replace(/^['"]|['"]$/g, "");
      const stack = [line];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        stack.push(next);
        if (methodSignature.test(next) && !/^\s*@/.test(next)) break;
        j += 1;
      }
      const joined = stack.join("\n");
      const documents200 =
        /@ApiResponse[\s\S]*?status:\s*(?:200|HttpStatus\.OK)/.test(joined);
      const hasHttpCode = /@HttpCode\s*\(/.test(joined);
      if (documents200 && !hasHttpCode) {
        const key = `${file}|${route}`;
        if (!ACTION_POST_ALLOWLIST.has(key)) {
          findings.push(
            `[action-post-status] ${file}:${i + 1} @Post('${route}') documents 200 but lacks @HttpCode(200) — add @HttpCode(HttpStatus.OK)`,
          );
        }
      }
    }
  }
}

reportFindingsAndExit("API route conformance check", findings, {
  failAlways: true,
  extraMessage:
    "See docs/architecture/API_DESIGN_STANDARD.md §1 (route-prefix) and §5 (action-post-status). Allowlisted action POSTs are fixed by adding @HttpCode(HttpStatus.OK) and removing the allowlist entry.",
});

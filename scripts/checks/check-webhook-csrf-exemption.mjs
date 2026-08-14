#!/usr/bin/env node

/**
 * P5.12 — CSRF exemption for webhook ingress must stay scoped.
 *
 * The global CsrfInterceptor exempts `/webhooks/*` POSTs from the CSRF
 * double-submit check (server-to-server provider callbacks are authenticated
 * by their own HMAC signature + replay dedupe, so a browser-session CSRF
 * double-submit is meaningless and would hard-block legit callbacks).
 *
 * This gate asserts the invariant that the exemption:
 *   1. exists (the `isWebhookIngress` guard is still called from the mutating
 *      branch of `intercept`),
 *   2. is POST-only (GET/HEAD/OPTIONS on /webhooks/* keep normal safe-method
 *      cookie handling, not the mutation bypass),
 *   3. is path-scoped to `/webhooks/*` (with an optional `/api`/`/api/vN`
 *      prefix) — never a bare `/webhooks` match or a wider prefix,
 *   4. is not mixed into the auth-bootstrap logic (the exemption call must
 *      appear in the explicit webhook/web-vitals/booking exemption branch,
 *      not as part of `canBootstrapCsrfForAuthMutation`).
 *
 * The path-regex assertion uses exact-string matching on the canonical
 * anchored literal `return /^\/(?:api(?:\/v\d+)?\/)?webhooks\//i.test(path);`.
 * If a future refactor intentionally changes the regex, the check fails and
 * the reviewer must re-anchor it and update this gate in the same change —
 * that is the point of a security ratchet.
 */

import { readFileSync } from "node:fs";
import { reportFindingsAndExit } from "../lib/check-runner.mjs";

const TARGET = "apps/api/src/shared/common/interceptors/csrf.interceptor.ts";

// The canonical anchored webhook regex, exactly as it must appear in the
// source (backslash-escaped regex literal). `/^\/` — anchored, then an
// optional `/api` or `/api/vN` prefix group, then `webhooks/`.
const CANONICAL_WEBHOOK_REGEX =
  'return /^\\/(?:api(?:\\/v\\d+)?\\/)?webhooks\\//i.test(path);';

function main() {
  const findings = [];

  let source;
  try {
    source = readFileSync(TARGET, "utf8");
  } catch {
    reportFindingsAndExit(
      "Webhook CSRF exemption check",
      [
        `${TARGET} not found or unreadable — the exemption guard must live in the global CsrfInterceptor`,
      ],
      { failAlways: true },
    );
    return;
  }

  // 1. The guard method must exist and be POST-only.
  if (
    !/private\s+isWebhookIngress\s*\(\s*request:\s*Request\s*\)\s*:\s*boolean/.test(
      source,
    )
  ) {
    findings.push(
      `${TARGET}: missing POST-only isWebhookIngress(request) guard`,
    );
  } else if (
    !/if\s*\(\s*method\s*!==\s*['"]POST['"]\s*\)\s*return\s*false/.test(source)
  ) {
    findings.push(
      `${TARGET}: isWebhookIngress must return false for non-POST methods`,
    );
  }

  // 2. The path regex must be the anchored /webhooks/ literal.
  if (!source.includes(CANONICAL_WEBHOOK_REGEX)) {
    findings.push(
      `${TARGET}: webhook path regex must be the anchored literal ${CANONICAL_WEBHOOK_REGEX} — a bare /webhooks match or a wider prefix widens the CSRF bypass`,
    );
  }

  // 3. The exemption branch must call isWebhookIngress alongside the other
  //    mutation exemptions (web-vitals + public booking), inside the
  //    `if (!this.isSafeMethod(...))` block.
  if (!/this\.isWebhookIngress\s*\(\s*request\s*\)/.test(source)) {
    findings.push(
      `${TARGET}: intercept() no longer calls this.isWebhookIngress(request)`,
    );
  }
  if (
    !/if\s*\(\s*this\.isPublicWebVitalsPost\s*\(\s*request\s*\)\s*\|\|\s*this\.isPublicBookingWrite\s*\(\s*request\s*\)\s*\|\|\s*this\.isWebhookIngress\s*\(\s*request\s*\)\s*\)/.test(
      source,
    )
  ) {
    findings.push(
      `${TARGET}: the isWebhookIngress call must live in the mutating exemption branch (web-vitals || public-booking || webhook) inside the !isSafeMethod block`,
    );
  }

  // 4. The exemption must not leak into the auth-bootstrap path.
  if (
    /canBootstrapCsrfForAuthMutation[\s\S]{0,1200}isWebhookIngress/.test(
      source,
    )
  ) {
    findings.push(
      `${TARGET}: isWebhookIngress appears inside canBootstrapCsrfForAuthMutation — the exemption must stay out of the auth-bootstrap logic`,
    );
  }

  reportFindingsAndExit("Webhook CSRF exemption check", findings, {
    failAlways: true,
    extraMessage:
      "See apps/api/test/e2e/webhooks/csrf-webhook-exemption.e2e-spec.ts for the behavioral regression contract.",
  });
}

main();

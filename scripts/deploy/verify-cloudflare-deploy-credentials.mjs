#!/usr/bin/env node
/**
 * Validates CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID before wrangler deploy.
 * Exits 0 when the token is active, scoped to the account, and can read zone Workers routes
 * (required for custom_domain routes in wrangler.toml).
 */

import process from "node:process";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ZONE_NAME = "docita.work";

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function cloudflareGet(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

if (!token || !accountId) {
  fail(
    "Cloudflare deploy credentials missing: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.",
  );
}

const verify = await cloudflareGet("/user/tokens/verify");
if (!verify.response.ok || verify.body?.success !== true) {
  const code = verify.body?.errors?.[0]?.code;
  fail(
    `CLOUDFLARE_API_TOKEN verification failed (HTTP ${verify.response.status}${code != null ? `, code ${code}` : ""}). ` +
      "Create a new API token (Edit Cloudflare Workers template) and update the repository secret.",
  );
}

const account = await cloudflareGet(`/accounts/${accountId}`);
if (!account.response.ok || account.body?.success !== true) {
  fail(
    `CLOUDFLARE_ACCOUNT_ID is not accessible with this token (HTTP ${account.response.status}). ` +
      "Scope the token to this account only and match CLOUDFLARE_ACCOUNT_ID to the Workers account id.",
  );
}

const zones = await cloudflareGet(
  `/zones?name=${encodeURIComponent(ZONE_NAME)}&status=active`,
);
const zoneId = zones.body?.result?.[0]?.id;
if (!zoneId) {
  fail(
    `Token cannot list zone "${ZONE_NAME}". Grant Zone:Zone:Read (or use an account token with access to docita.work).`,
  );
}

const routes = await cloudflareGet(`/zones/${zoneId}/workers/routes`);
if (!routes.response.ok || routes.body?.success !== true) {
  const code = routes.body?.errors?.[0]?.code;
  fail(
    `Token cannot access Workers routes for ${ZONE_NAME} (HTTP ${routes.response.status}${code != null ? `, code ${code}` : ""}). ` +
      "Grant Zone:Workers Routes:Edit (or Account:Workers Scripts:Edit plus zone access) — required for wrangler custom_domain deploy.",
  );
}

process.stdout.write(
  "Cloudflare deploy credentials verified (token, account, zone Workers routes).\n",
);

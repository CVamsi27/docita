#!/usr/bin/env node

/**
 * Shared helpers for synthetic uptime probes (see docs/operations/SYNTHETIC_MONITORING.md).
 */

const DEFAULT_TIMEOUT_MS = 5_000;

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return { response, latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

function parseSentryDsn(dsn) {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    const host = url.host;
    const publicKey = url.username;
    if (!host || !projectId || !publicKey) return null;
    return { host, projectId, publicKey };
  } catch {
    return null;
  }
}

export async function reportProbeFailureToSentry(dsn, probeName, errorMessage, extra = {}) {
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const envelope = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    logger: "synthetic-monitoring",
    message: `Synthetic probe failed: ${probeName}`,
    tags: {
      probe: probeName,
      source: "synthetic-monitoring",
    },
    extra: {
      errorMessage,
      ...extra,
    },
  };

  const body = JSON.stringify(envelope);
  const url = `https://${parsed.host}/api/${parsed.projectId}/store/`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=synthetic-probe/1.0, sentry_key=${parsed.publicKey}`,
    },
    body,
  }).catch(() => {
    // Non-blocking: probe runner still exits non-zero for CI paging.
  });
}

/** Posts a Slack-compatible payload when OPS_ALERT_WEBHOOK_URL is configured. */
export async function reportOpsAlertToWebhook(webhookUrl, title, text, extra = {}) {
  const url = webhookUrl?.trim();
  if (!url) return;

  const tagLine = Object.entries(extra)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  const body = JSON.stringify({
    text: [`[PAGE] ${title}`, text, tagLine].filter(Boolean).join("\n"),
  });

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {
    // Non-blocking: workflow failure + Sentry remain the primary signals.
  });
}

export class ProbeFailure extends Error {
  constructor(probeName, message, details = {}) {
    super(`[${probeName}] ${message}`);
    this.name = "ProbeFailure";
    this.probeName = probeName;
    this.details = details;
  }
}

export async function runProbe(probeName, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    return {
      probeName,
      ok: true,
      latencyMs: Date.now() - startedAt,
      ...result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ProbeFailure(probeName, message, {
      latencyMs: Date.now() - startedAt,
    });
  }
}

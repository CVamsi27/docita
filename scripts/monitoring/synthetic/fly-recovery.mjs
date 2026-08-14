#!/usr/bin/env node

/**
 * Fly Machines auto-recovery for the synthetic monitor (see
 * docs/operations/SYNTHETIC_MONITORING.md).
 *
 * Background: `docita-api` uses `auto_stop_machines = 'suspend'`. A resume from
 * a memory snapshot can occasionally come back frozen — the Node process is
 * "started" but never binds port 3001, so the Fly proxy returns
 * `PR01: no known healthy instances` and probes time out. A cold `machine
 * restart` clears it instantly. This module lets the monitor issue exactly one
 * such restart when it sees that signature, instead of paging a human.
 *
 * Recovery is opt-in: it is a no-op unless `FLY_API_TOKEN` is set (so local
 * runs and unconfigured environments keep the current behaviour).
 *
 * Env:
 *   FLY_API_TOKEN          (required to enable — Fly deploy/org token for the app)
 *   FLY_API_APP_NAME       (default docita-api)
 *   FLY_API_PROCESS_GROUP  (default app)
 *   FLY_API_HOSTNAME       (default https://api.machines.dev — override for testing)
 */

const FLY_MACHINES_API =
  process.env.FLY_API_HOSTNAME?.replace(/\/$/, "") ?? "https://api.machines.dev";

const LIST_TIMEOUT_MS = 30_000;
const RESTART_TIMEOUT_MS = 30_000;
const WAIT_TIMEOUT_MS = 70_000;

/**
 * Failure signatures that a cold restart can plausibly clear: the API is
 * unreachable or wedged below the HTTP layer. Deliberately excludes failures
 * where the app *did* respond (latency-budget breaches, payload mismatches,
 * 4xx) — restarting those would mask a real regression rather than fix it.
 */
const RECOVERABLE_SIGNATURES = [
  "timed out",
  "fetch failed",
  "econnrefused",
  "connection refused",
  "socket hang up",
  "no known healthy",
  "pr01",
  "got 502",
  "got 503",
  "got 504",
  "got 525",
];

export function isFlyRecoveryEnabled() {
  return Boolean(process.env.FLY_API_TOKEN?.trim());
}

export function shouldAttemptFlyRecovery(message) {
  if (!message) return false;
  const normalized = String(message).toLowerCase();
  return RECOVERABLE_SIGNATURES.some((signature) =>
    normalized.includes(signature),
  );
}

async function flyMachinesRequest(path, { method = "GET", timeoutMs } = {}) {
  const token = process.env.FLY_API_TOKEN?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${FLY_MACHINES_API}/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Fly Machines API request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cold-restarts every machine in the given process group for `app` and waits
 * for each to report `started`. The machine id is discovered live because it
 * changes across deploys. Returns `{ ok, machineIds }` or `{ ok: false, error }`.
 */
export async function restartFlyAppMachines({ app, processGroup = "app" }) {
  let listResponse;
  try {
    listResponse = await flyMachinesRequest(`/apps/${app}/machines`, {
      timeoutMs: LIST_TIMEOUT_MS,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  if (!listResponse.ok) {
    return {
      ok: false,
      error: `list machines for ${app} returned ${listResponse.status}`,
    };
  }

  const machines = await listResponse.json().catch(() => null);
  if (!Array.isArray(machines)) {
    return { ok: false, error: `unexpected machines payload for ${app}` };
  }

  const targets = machines.filter(
    (machine) =>
      (machine?.config?.metadata?.fly_process_group ?? "app") === processGroup,
  );

  if (targets.length === 0) {
    const detail =
      machines.length === 0
        ? `no machines found for ${app} at all — the machine may still be provisioning after a scale-up`
        : `no machines in process group "${processGroup}" for ${app} (${machines.length} machine(s) found in other groups)`;
    return { ok: false, error: detail };
  }

  const restarted = [];
  for (const machine of targets) {
    let restartResponse;
    try {
      restartResponse = await flyMachinesRequest(
        `/apps/${app}/machines/${machine.id}/restart`,
        { method: "POST", timeoutMs: RESTART_TIMEOUT_MS },
      );
    } catch (error) {
      return {
        ok: false,
        error: `restart ${machine.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        machineIds: restarted,
      };
    }

    if (!restartResponse.ok) {
      return {
        ok: false,
        error: `restart ${machine.id} returned ${restartResponse.status}`,
        machineIds: restarted,
      };
    }

    restarted.push(machine.id);

    // Best-effort: block until the machine reports started before the re-probe.
    // Its own retry loop covers the remaining in-VM boot time.
    await flyMachinesRequest(
      `/apps/${app}/machines/${machine.id}/wait?state=started&timeout=60`,
      { timeoutMs: WAIT_TIMEOUT_MS },
    ).catch(() => {});
  }

  return { ok: true, machineIds: restarted };
}

import { getAppApiUrl } from "./api-config";

const API_HEALTH_RETRY_DELAY_MS = 2_000;
const API_HEALTH_TIMEOUT_MS = 5_000;
function isServerUnavailableStatus(status: number): boolean {
  return status >= 500 && status <= 599;
}

interface ApiAvailabilitySnapshot {
  isUnavailable: boolean;
}

const availableSnapshot: ApiAvailabilitySnapshot = { isUnavailable: false };
const unavailableSnapshot: ApiAvailabilitySnapshot = { isUnavailable: true };
const listeners = new Set<() => void>();

let snapshot = availableSnapshot;
let recoveryPromise: Promise<void> | null = null;

function emitChange(nextSnapshot: ApiAvailabilitySnapshot): void {
  if (snapshot === nextSnapshot) {
    return;
  }

  snapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function isApiHealthy(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    API_HEALTH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${getAppApiUrl()}/health`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function recoverApiAvailability(): Promise<void> {
  while (snapshot.isUnavailable) {
    if (await isApiHealthy()) {
      markApiAvailable();
      return;
    }

    await sleep(API_HEALTH_RETRY_DELAY_MS);
  }
}

function markApiAvailable(): void {
  emitChange(availableSnapshot);
}

function markApiUnavailable(): void {
  if (typeof window === "undefined") {
    return;
  }

  emitChange(unavailableSnapshot);
  recoveryPromise ??= recoverApiAvailability().finally(() => {
    recoveryPromise = null;
  });
}

export function trackApiResponse(response: Response): void {
  if (isServerUnavailableStatus(response.status)) {
    markApiUnavailable();
    return;
  }

  markApiAvailable();
}

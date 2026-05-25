import { API_URL } from "@/lib/api/api-config";
import { browserRequest } from "@/lib/auth/browser-request";
import { appSession } from "@/lib/auth/session";

export interface ClientErrorPayload {
  type: string;
  message: string;
  severity?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

const MAX_STRING_LENGTH = 1000;
const AUTH_BACKOFF_MS = 15 * 60 * 1000;
const RATE_LIMIT_BACKOFF_MS = 60 * 1000;
const NETWORK_BACKOFF_MS = 30 * 1000;
const DISABLED_UNTIL_STORAGE_KEY =
  "docita_client_error_reporting_disabled_until";

let disabledUntil = 0;

const loadDisabledUntil = (): number => {
  if (typeof window === "undefined") return 0;
  if (disabledUntil > Date.now()) return disabledUntil;
  try {
    const raw = sessionStorage.getItem(DISABLED_UNTIL_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed <= Date.now()) {
      sessionStorage.removeItem(DISABLED_UNTIL_STORAGE_KEY);
      return 0;
    }
    disabledUntil = parsed;
    return parsed;
  } catch {
    return 0;
  }
};

const disableReportingFor = (durationMs: number): void => {
  const until = Date.now() + durationMs;
  disabledUntil = until;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISABLED_UNTIL_STORAGE_KEY, String(until));
  } catch {
    // ignore storage errors
  }
};

const trimValue = (value: string): string =>
  value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return trimValue(error.message);
  }

  if (typeof error === "string") {
    return trimValue(error);
  }

  try {
    return trimValue(JSON.stringify(error));
  } catch {
    return "Unknown client error";
  }
};

export const reportClientError = async (
  payload: ClientErrorPayload,
): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  if (loadDisabledUntil() > Date.now()) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return;
  }

  const token = appSession.getToken();
  if (!token) {
    return;
  }

  const body = {
    ...payload,
    message: normalizeErrorMessage(payload.message),
    stack: payload.stack ? trimValue(payload.stack) : undefined,
    path: payload.path ?? window.location.pathname,
  };

  try {
    const response = await browserRequest(
      `${API_URL}/monitoring/client-errors`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        keepalive: true,
        cache: "no-store",
        body: JSON.stringify(body),
      },
    );

    if (response.ok) {
      return;
    }

    if (response.status === 401 || response.status === 403) {
      disableReportingFor(AUTH_BACKOFF_MS);
      return;
    }

    if (response.status === 429) {
      disableReportingFor(RATE_LIMIT_BACKOFF_MS);
      return;
    }
  } catch {
    disableReportingFor(NETWORK_BACKOFF_MS);
    return;
  }
};

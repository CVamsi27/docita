import { API_URL } from "@/lib/api-config";

export interface ClientErrorPayload {
  type: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

const MAX_STRING_LENGTH = 1000;

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

  const token = localStorage.getItem("docita_token");
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
    await fetch(`${API_URL}/monitoring/client-errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(body),
    });
  } catch {
    return;
  }
};

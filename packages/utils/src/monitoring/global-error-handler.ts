import { inBrowser } from "../browser.js";

export interface ErrorReporterCapture {
  (
    error: Error,
    context?: Record<string, unknown>,
  ): void;
}

// Module-level guard so a re-install (HMR, StrictMode double-mount) does not
// stack handlers. Replaces the per-app `window.__errorHandlerInstalled` flag
// (P5.4e) — the dedupe only needs to survive the module instance, which the
// shared package guarantees across app reloads.
let errorHandlerInstalled = false;

/**
 * Install global `unhandledrejection` / `window.onerror` handlers that forward
 * to the app's Sentry capture. Both `apps/app-vite` and `apps/internal-vite`
 * call this once at bootstrap with their own `captureException` (the PHI-safe
 * capture from `sentry.client.config.ts`).
 *
 * The `window.onerror` handler returns `true` to suppress the default browser
 * error dialog, matching the previous per-app implementations.
 */
export function installGlobalErrorHandler(
  captureException: ErrorReporterCapture,
): void {
  if (!inBrowser()) return;
  if (errorHandlerInstalled) return;
  errorHandlerInstalled = true;

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const error =
      reason instanceof Error
        ? reason
        : new Error(
            typeof reason === "string"
              ? reason
              : "Unhandled Promise Rejection",
          );

    captureException(error, {
      type: "unhandled_promise_rejection",
      reason: typeof reason === "string" ? reason : undefined,
    });
  });

  window.onerror = (message, source, lineno, colno, error) => {
    // Normalize the legacy Event-arg form (old engines pass an Event object)
    // to a readable message instead of "[object Event]".
    const messageText =
      typeof message === "string" ? message : "Script error";
    captureException(error ?? new Error(messageText), {
      type: "window_onerror",
      source: source ?? undefined,
      line: lineno ?? undefined,
      column: colno ?? undefined,
    });

    // Return true to prevent the default browser error handler
    return true;
  };
}

import { captureException } from "./sentry.client.config";
import { inBrowser } from "@workspace/utils";

/**
 * Install global error handlers that capture unhandled promise rejections
 * and uncaught window errors and forward them to Sentry.
 *
 * Call once at app bootstrap (in main.tsx) after initializeSentryClient().
 */
export function installGlobalErrorHandler(): void {
  // Defensive for any non-browser runtime; inBrowser() lives in
  // @workspace/utils where the check is a genuine runtime condition.
  if (!inBrowser()) return;

  // Prevent duplicate installation (flags declared in src/app-globals.d.ts)
  if (window.__errorHandlerInstalled) return;
  window.__errorHandlerInstalled = true;

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const error =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === "string" ? reason : "Unhandled Promise Rejection");

    captureException(error, {
      type: "unhandled_promise_rejection",
      reason: typeof reason === "string" ? reason : undefined,
    });
  });

  window.onerror = (message, source, lineno, colno, error) => {
    captureException(error ?? new Error(String(message)), {
      type: "window_onerror",
      source: source ?? undefined,
      line: lineno ?? undefined,
      column: colno ?? undefined,
    });

    // Return true to prevent the default browser error handler
    return true;
  };
}

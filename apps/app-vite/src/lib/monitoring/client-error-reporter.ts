import { captureException } from "./sentry.client.config";

/**
 * Install global error handlers that capture unhandled promise rejections
 * and uncaught window errors and forward them to Sentry.
 *
 * Call once at app bootstrap (in main.tsx) after initializeSentryClient().
 */
export function installGlobalErrorHandler(): void {
  if (typeof window === "undefined") return;

  // Prevent duplicate installation
  const win = window as unknown as Record<string, unknown>;
  if (win.__errorHandlerInstalled) return;
  win.__errorHandlerInstalled = true;

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

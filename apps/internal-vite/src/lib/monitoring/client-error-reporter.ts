import { captureException } from "./sentry.client.config";
import { inBrowser } from "@workspace/utils";

export function installGlobalErrorHandler(): void {
  // Defensive for any non-browser runtime; inBrowser() lives in
  // @workspace/utils where the check is a genuine runtime condition.
  if (!inBrowser()) return;

  // Prevent duplicate installation (flags declared in src/app-globals.d.ts)
  if (window.__errorHandlerInstalled) return;
  window.__errorHandlerInstalled = true;

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason;
    const error = reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : "Unhandled Promise Rejection");
    captureException(error, { type: "unhandled_promise_rejection" });
  });

  window.onerror = (event: string | Event, source?: string, lineno?: number, colno?: number, error?: Error | null) => {
    const message = typeof event === "string" ? event : "Script error";
    captureException(error ?? new Error(message), {
      type: "window_onerror",
      source,
      line: lineno,
      column: colno,
    });
    return true;
  };
}

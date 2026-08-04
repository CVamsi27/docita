// check-as-cast-density: allow-file — window global flag read via untyped Record (platform gap, no DOM typings for app globals)
import { captureException } from "./sentry.client.config";

export function installGlobalErrorHandler(): void {
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive for SSR */
  if (typeof window === "undefined") return;

  const win = window as unknown as Record<string, boolean | undefined>;
  if (win.__errorHandlerInstalled) return;
  win.__errorHandlerInstalled = true;

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

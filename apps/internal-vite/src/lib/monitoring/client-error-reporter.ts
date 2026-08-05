import { installGlobalErrorHandler as installSharedErrorHandler } from "@workspace/utils";
import { captureException } from "./sentry.client.config";

/**
 * Install global error handlers (unhandledrejection + window.onerror) that
 * forward to Sentry. The wiring lives in @workspace/utils (P5.4e); this shim
 * binds the internal admin app's PHI-safe capture. Call once at app bootstrap
 * after initializeSentryClient().
 */
export function installGlobalErrorHandler(): void {
  installSharedErrorHandler(captureException);
}

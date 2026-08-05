/**
 * Ambient declarations for app-level browser globals set by the monitoring
 * reporters. Typing them here removes the `window as unknown as Record` casts
 * at the install sites (P5.2e). Keep in sync with the writers
 * (lib/monitoring/client-error-reporter.ts, lib/monitoring/web-vitals.ts).
 */
interface Window {
  __errorHandlerInstalled?: boolean;
  __vitalsReporterInstalled?: boolean;
}

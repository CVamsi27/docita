import {
  installWebVitalsReporter as installSharedWebVitalsReporter,
} from "@workspace/data-access";
import { getAppApiUrl } from "@/lib/api/api-url-resolver";
import { captureMessage } from "./sentry.client.config";

/**
 * Install the anonymous web-vitals RUM reporter for the clinician app.
 *
 * The reporter lives in @workspace/data-access (P4.5/P5.4e consolidation);
 * this wrapper binds the app's feature discriminator, same-origin API base
 * (Cloudflare Worker / dev proxy), and the Sentry breadcrumb hook.
 */
export function installWebVitalsReporter(): void {
  installSharedWebVitalsReporter({
    baseURL: getAppApiUrl(),
    feature: "clinician-app",
    onMetric: (name) => captureMessage(`Web Vitals: ${name}`, "info"),
  });
}

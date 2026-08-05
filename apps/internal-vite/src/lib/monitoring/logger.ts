// The shared breadcrumb logger is built by the app's Sentry config binding
// (P5.4e); keep this path so existing consumers resolve the same instance.
export { logger } from "./sentry.client.config";

const DEFAULT_API_URL = "/api/v1";

const UPSTREAM_API_HOSTS = new Set([
  "api.docita.work",
  "staging-api.docita.work",
]);

/**
 * Resolve the browser-facing API base URL.
 *
 * Cloudflare production must use the same-origin `/api/v1` proxy so httpOnly
 * auth cookies (set on app.docita.work) ride on every fetch. Pointing the
 * client at https://api.docita.work breaks refresh and protected routes.
 */
export function resolveAppApiUrl(value: string, origin?: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  const runtimeOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!runtimeOrigin) {
    return value;
  }

  return new URL(value, runtimeOrigin).toString().replace(/\/$/, "");
}

/**
 * When a Cloudflare build accidentally inlines NEXT_PUBLIC_API_URL as the
 * upstream Fly origin, browser fetches become cross-origin and fail CORS +
 * cookie auth. Prefer the app-origin proxy whenever we are not on the API host.
 */
export function shouldUseSameOriginAppProxy(
  configured: string,
  hostname: string,
): boolean {
  if (UPSTREAM_API_HOSTS.has(hostname)) {
    return false;
  }

  if (configured.startsWith("/")) {
    return false;
  }

  try {
    const configuredHost = new URL(configured).hostname;
    return UPSTREAM_API_HOSTS.has(configuredHost);
  } catch {
    return false;
  }
}

function resolvePublishedAppApiUrl(): string {
  const configured = process.env["NEXT_PUBLIC_API_URL"] || DEFAULT_API_URL;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (shouldUseSameOriginAppProxy(configured, hostname)) {
      return resolveAppApiUrl("/api/v1", origin);
    }
  }

  return resolveAppApiUrl(configured);
}

/** Resolve the browser-facing API base at call time (safe for client bundles). */
export function getAppApiUrl(): string {
  return resolvePublishedAppApiUrl();
}

export const API_URL = getAppApiUrl();

const isCloudflareBuild = process.env["DOCITA_CLOUDFLARE"] === "1";
const defaultAppUrl = isCloudflareBuild
  ? "https://app.docita.work"
  : "http://localhost:3000";
const defaultSocketUrl = isCloudflareBuild
  ? "https://api.docita.work"
  : "http://localhost:3001";

export const getApiUrl = (): string => getAppApiUrl();
export const getAppUrl = (): string =>
  process.env["NEXT_PUBLIC_APP_URL"] || defaultAppUrl;
export const getSocketUrl = (): string =>
  process.env["NEXT_PUBLIC_SOCKET_URL"] || defaultSocketUrl;

export const getContactInquiryUrl = (): string =>
  `${getApiUrl()}/contact/inquiry`;
export const getLoginUrl = (): string => `${getAppUrl()}/login`;
export const getSubscriptionConfigUrl = (): string =>
  `${getApiUrl()}/subscription/config`;
export const getTierConfigUrl = (): string => getSubscriptionConfigUrl();
export const getChangePasswordUrl = (): string =>
  `${getApiUrl()}/auth/change-password`;
export const getPrescriptionPdfUrl = (prescriptionId: string): string =>
  `${getApiUrl()}/prescriptions/${prescriptionId}/pdf`;

export const API_ENDPOINTS = {
  AUTH_REGISTER: () => `${getApiUrl()}/auth/register`,
  AUTH_LOGIN: () => `${getApiUrl()}/auth/login`,
  AUTH_LOGOUT: () => `${getApiUrl()}/auth/logout`,
  AUTH_REFRESH: () => `${getApiUrl()}/auth/refresh`,
  AUTH_CHANGE_PASSWORD: () => `${getApiUrl()}/auth/change-password`,
  CONTACT_INQUIRY: () => `${getApiUrl()}/contact/inquiry`,
  SUBSCRIPTION_CONFIG: () => `${getApiUrl()}/subscription/config`,
  SUBSCRIPTION_TIERS: () => `${getApiUrl()}/subscription/tiers`,
  SUBSCRIPTION_CREATE: () => `${getApiUrl()}/subscription/create`,
  CLINICS: () => `${getApiUrl()}/clinics`,
  CLINIC: (id: string) => `${getApiUrl()}/clinics/${id}`,
  PATIENTS: () => `${getApiUrl()}/patients`,
  PATIENT: (id: string) => `${getApiUrl()}/patients/${id}`,
  PRESCRIPTIONS: () => `${getApiUrl()}/prescriptions`,
  PRESCRIPTION: (id: string) => `${getApiUrl()}/prescriptions/${id}`,
  PRESCRIPTION_PDF: (id: string) => `${getApiUrl()}/prescriptions/${id}/pdf`,
  APPOINTMENTS: () => `${getApiUrl()}/appointments`,
  APPOINTMENT: (id: string) => `${getApiUrl()}/appointments/${id}`,
  INVOICES: () => `${getAppUrl()}/invoices`,
  INVOICE: (id: string) => `${getAppUrl()}/invoices/${id}`,
  LAB_TESTS: () => `${getApiUrl()}/lab-tests`,
  LAB_TEST: (id: string) => `${getApiUrl()}/lab-tests/${id}`,
  INVENTORY: () => `${getApiUrl()}/inventory`,
  INVENTORY_ITEM: (id: string) => `${getApiUrl()}/inventory/${id}`,
  DOCUMENTS: () => `${getApiUrl()}/documents`,
  DOCUMENT: (id: string) => `${getApiUrl()}/documents/${id}`,
  ANALYTICS: () => `${getApiUrl()}/analytics`,
  QUEUE: () => `${getApiUrl()}/queue`,
  SETTINGS: () => `${getApiUrl()}/settings`,
} as const;

export const APP_URLS = {
  HOME: () => `${getAppUrl()}/`,
  LOGIN: () => `${getAppUrl()}/login`,
  REGISTER: () => `${getAppUrl()}/register`,
  DASHBOARD: () => `${getAppUrl()}/dashboard`,
  LOGOUT: () => `${getAppUrl()}/logout`,
} as const;

export const STORAGE_KEYS = {
  TOKEN: "docita_token",
  CLINIC: "docita_clinic",
} as const;

export const APP_CONFIG = {
  API_TIMEOUT: 30000,
  SOCKET_RECONNECT_DELAY: 1000,
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_PAGE: 1,
  TOAST_DURATION: 3000,
  STALE_TIME: 5 * 60 * 1000,
  CACHE_TIME: 30 * 60 * 1000,
} as const;

const config = {
  getApiUrl,
  getAppUrl,
  getSocketUrl,
  getContactInquiryUrl,
  getLoginUrl,
  getSubscriptionConfigUrl,
  getTierConfigUrl,
  getChangePasswordUrl,
  getPrescriptionPdfUrl,
  API_ENDPOINTS,
  APP_URLS,
  STORAGE_KEYS,
  APP_CONFIG,
};

export default config;

import { getAppApiUrl } from "./api-url-resolver";

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

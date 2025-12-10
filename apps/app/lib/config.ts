/**
 * Application Configuration
 *
 * Centralizes all configuration values using environment variables.
 * Environment variables (with NEXT_PUBLIC_ prefix are exposed to client):
 * - NEXT_PUBLIC_API_URL: API base URL (defaults: http://localhost:3001/api)
 * - NEXT_PUBLIC_APP_URL: App base URL (defaults: http://localhost:3000)
 * - NEXT_PUBLIC_SOCKET_URL: WebSocket URL (defaults: http://localhost:3001)
 */

// Dynamic environment variable access
const envApiUrl =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;
const envAppUrl =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_APP_URL
    : process.env.NEXT_PUBLIC_APP_URL;
const envSocketUrl =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_SOCKET_URL
    : process.env.NEXT_PUBLIC_SOCKET_URL;

/**
 * Get the API base URL from environment or fallback to localhost
 */
export const getApiUrl = (): string => envApiUrl || "http://localhost:3001/api";

/**
 * Get the app base URL from environment or fallback to localhost
 */
export const getAppUrl = (): string => envAppUrl || "http://localhost:3000";

/**
 * Get the socket URL from environment or fallback to localhost
 */
export const getSocketUrl = (): string =>
  envSocketUrl || "http://localhost:3001";

/**
 * Build full contact inquiry URL
 */
export const getContactInquiryUrl = (): string =>
  `${getApiUrl()}/contact/inquiry`;

/**
 * Build full login URL
 */
export const getLoginUrl = (): string => `${getAppUrl()}/login`;

/**
 * Build full subscription config URL
 */
export const getSubscriptionConfigUrl = (): string =>
  `${getApiUrl()}/subscription/config`;

/**
 * Build full tier config URL
 */
export const getTierConfigUrl = (): string =>
  `${getApiUrl()}/subscription/config`;

/**
 * Build full change password URL
 */
export const getChangePasswordUrl = (): string =>
  `${getApiUrl()}/auth/change-password`;

/**
 * Build full PDF prescription URL
 */
export const getPrescriptionPdfUrl = (prescriptionId: string): string =>
  `${getApiUrl()}/prescriptions/${prescriptionId}/pdf`;

/**
 * Get all API endpoints as a configuration object
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: () => `${getApiUrl()}/auth/register`,
  AUTH_LOGIN: () => `${getApiUrl()}/auth/login`,
  AUTH_LOGOUT: () => `${getApiUrl()}/auth/logout`,
  AUTH_REFRESH: () => `${getApiUrl()}/auth/refresh`,
  AUTH_CHANGE_PASSWORD: () => `${getApiUrl()}/auth/change-password`,

  // Contact
  CONTACT_INQUIRY: () => `${getApiUrl()}/contact/inquiry`,

  // Subscription
  SUBSCRIPTION_CONFIG: () => `${getApiUrl()}/subscription/config`,
  SUBSCRIPTION_TIERS: () => `${getApiUrl()}/subscription/tiers`,
  SUBSCRIPTION_CREATE: () => `${getApiUrl()}/subscription/create`,

  // Clinics
  CLINICS: () => `${getApiUrl()}/clinics`,
  CLINIC: (id: string) => `${getApiUrl()}/clinics/${id}`,

  // Patients
  PATIENTS: () => `${getApiUrl()}/patients`,
  PATIENT: (id: string) => `${getApiUrl()}/patients/${id}`,

  // Prescriptions
  PRESCRIPTIONS: () => `${getApiUrl()}/prescriptions`,
  PRESCRIPTION: (id: string) => `${getApiUrl()}/prescriptions/${id}`,
  PRESCRIPTION_PDF: (id: string) => `${getApiUrl()}/prescriptions/${id}/pdf`,

  // Appointments
  APPOINTMENTS: () => `${getApiUrl()}/appointments`,
  APPOINTMENT: (id: string) => `${getApiUrl()}/appointments/${id}`,

  // Invoices
  INVOICES: () => `${getApiUrl()}/invoices`,
  INVOICE: (id: string) => `${getApiUrl()}/invoices/${id}`,

  // Lab Tests
  LAB_TESTS: () => `${getApiUrl()}/lab-tests`,
  LAB_TEST: (id: string) => `${getApiUrl()}/lab-tests/${id}`,

  // Inventory
  INVENTORY: () => `${getApiUrl()}/inventory`,
  INVENTORY_ITEM: (id: string) => `${getApiUrl()}/inventory/${id}`,

  // Documents
  DOCUMENTS: () => `${getApiUrl()}/documents`,
  DOCUMENT: (id: string) => `${getApiUrl()}/documents/${id}`,

  // Analytics
  ANALYTICS: () => `${getApiUrl()}/analytics`,

  // Queue
  QUEUE: () => `${getApiUrl()}/queue`,

  // Settings
  SETTINGS: () => `${getApiUrl()}/settings`,
} as const;

/**
 * Frontend URLs
 */
export const APP_URLS = {
  HOME: () => `${getAppUrl()}/`,
  LOGIN: () => `${getAppUrl()}/login`,
  REGISTER: () => `${getAppUrl()}/register`,
  DASHBOARD: () => `${getAppUrl()}/dashboard`,
  LOGOUT: () => `${getAppUrl()}/logout`,
} as const;

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  TOKEN: "docita_token",
  USER: "docita_user",
  CLINIC: "docita_clinic",
} as const;

/**
 * Default configuration values
 */
export const APP_CONFIG = {
  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  SOCKET_RECONNECT_DELAY: 1000, // 1 second

  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_PAGE: 1,

  // Toast notifications
  TOAST_DURATION: 3000, // 3 seconds

  // Cache
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 30 * 60 * 1000, // 30 minutes
} as const;

export default {
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

/**
 * API Endpoints
 * Centralized API route definitions
 */

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    refresh: "/api/auth/refresh",
  },

  // Clinic
  clinic: {
    get: "/api/clinic",
    update: "/api/clinic",
    settings: "/api/clinic/settings",
  },

  // Patients
  patients: {
    list: "/api/patients",
    create: "/api/patients",
    get: (id: string) => `/api/patients/${id}`,
    update: (id: string) => `/api/patients/${id}`,
    delete: (id: string) => `/api/patients/${id}`,
  },

  // Appointments
  appointments: {
    list: "/api/appointments",
    create: "/api/appointments",
    get: (id: string) => `/api/appointments/${id}`,
    update: (id: string) => `/api/appointments/${id}`,
    cancel: (id: string) => `/api/appointments/${id}/cancel`,
  },

  // Invoices
  invoices: {
    list: "/api/invoices",
    create: "/api/invoices",
    get: (id: string) => `/api/invoices/${id}`,
    download: (id: string) => `/api/invoices/${id}/download`,
  },

  // Subscriptions
  subscriptions: {
    get: "/api/subscriptions",
    upgrade: "/api/subscriptions/upgrade",
    cancel: "/api/subscriptions/cancel",
  },
} as const;

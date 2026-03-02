

export const API_ENDPOINTS = {

  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    refresh: "/api/auth/refresh",
  },

  clinic: {
    get: "/api/clinic",
    update: "/api/clinic",
    settings: "/api/clinic/settings",
  },

  patients: {
    list: "/api/patients",
    create: "/api/patients",
    get: (id: string) => `/api/patients/${id}`,
    update: (id: string) => `/api/patients/${id}`,
    delete: (id: string) => `/api/patients/${id}`,
  },

  appointments: {
    list: "/api/appointments",
    create: "/api/appointments",
    get: (id: string) => `/api/appointments/${id}`,
    update: (id: string) => `/api/appointments/${id}`,
    cancel: (id: string) => `/api/appointments/${id}/cancel`,
  },

  invoices: {
    list: "/api/invoices",
    create: "/api/invoices",
    get: (id: string) => `/api/invoices/${id}`,
    download: (id: string) => `/api/invoices/${id}/download`,
  },

  subscriptions: {
    get: "/api/subscriptions",
    upgrade: "/api/subscriptions/upgrade",
    cancel: "/api/subscriptions/cancel",
  },
} as const;

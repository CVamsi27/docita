import { Patient, Appointment } from "@workspace/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";

async function fetchAPI(endpoint: string, options?: RequestInit) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}`, error);
    throw error;
  }
}

async function fetchAPIWithAuth(endpoint: string, options?: RequestInit) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("docita_token") : null;
  return fetchAPI(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

// Health Check Types
export interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    memory: {
      status: string;
      heapUsed: number;
      heapTotal: number;
      rss: number;
      heapUsagePercent: number;
    };
    cpu: { status: string; user: number; system: number };
  };
}

export interface SystemHealth {
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: { user: number; system: number };
  databaseConnected: boolean;
  lastErrors: number;
  avgResponseTime: number;
  requestsLastHour: number;
  errorsLastHour: number;
}

export interface RequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByPath: { path: string; count: number; avgDuration: number }[];
  requestsByStatus: { statusCode: number; count: number }[];
  requestsByHour: { hour: number; count: number }[];
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedErrors: number;
  errorsBySeverity: { severity: string; count: number }[];
  errorsByType: { type: string; count: number }[];
  recentErrors: {
    id: string;
    type: string;
    message: string;
    path?: string;
    severity: string;
    createdAt: string;
  }[];
  errorTrend: { date: string; count: number }[];
}

export interface PerformanceMetrics {
  slowestEndpoints: {
    path: string;
    method: string;
    avgDuration: number;
    maxDuration: number;
    count: number;
  }[];
  responseTimeDistribution: { range: string; count: number }[];
  throughputByMinute: { minute: string; count: number }[];
}

export interface MonitoringDashboard {
  health: SystemHealth;
  last24Hours: {
    requests: RequestStats;
    errors: ErrorStats;
  };
  last7Days: {
    performance: PerformanceMetrics;
  };
}

export const healthAPI = {
  getHealth: (): Promise<HealthCheckResult> => fetchAPI("/health"),
  getLiveness: (): Promise<{ status: string }> => fetchAPI("/health/live"),
  getReadiness: (): Promise<{ status: string; database: boolean }> =>
    fetchAPI("/health/ready"),
};

export const monitoringAPI = {
  getDashboard: (clinicId?: string): Promise<MonitoringDashboard> =>
    fetchAPIWithAuth(
      `/monitoring/dashboard${clinicId ? `?clinicId=${clinicId}` : ""}`,
    ),
  getHealth: (): Promise<SystemHealth> =>
    fetchAPIWithAuth("/monitoring/health"),
  getRequestStats: (
    startDate?: string,
    endDate?: string,
    clinicId?: string,
  ): Promise<RequestStats> => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (clinicId) params.append("clinicId", clinicId);
    const queryString = params.toString();
    return fetchAPIWithAuth(
      `/monitoring/requests${queryString ? `?${queryString}` : ""}`,
    );
  },
  getErrorStats: (
    startDate?: string,
    endDate?: string,
    clinicId?: string,
  ): Promise<ErrorStats> => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (clinicId) params.append("clinicId", clinicId);
    const queryString = params.toString();
    return fetchAPIWithAuth(
      `/monitoring/errors${queryString ? `?${queryString}` : ""}`,
    );
  },
  getPerformance: (
    startDate?: string,
    endDate?: string,
  ): Promise<PerformanceMetrics> => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const queryString = params.toString();
    return fetchAPIWithAuth(
      `/monitoring/performance${queryString ? `?${queryString}` : ""}`,
    );
  },
  resolveError: (
    errorId: string,
    resolvedBy: string,
  ): Promise<{ success: boolean }> =>
    fetchAPIWithAuth(`/monitoring/errors/${errorId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolvedBy }),
    }),
  resolveMultipleErrors: (
    errorIds: string[],
    resolvedBy: string,
  ): Promise<{ success: boolean; count: number }> =>
    fetchAPIWithAuth("/monitoring/errors/resolve-multiple", {
      method: "POST",
      body: JSON.stringify({ errorIds, resolvedBy }),
    }),
  cleanup: (
    daysToKeep?: number,
  ): Promise<{
    requestsDeleted: number;
    errorsDeleted: number;
    metricsDeleted: number;
  }> =>
    fetchAPIWithAuth("/monitoring/cleanup", {
      method: "POST",
      body: JSON.stringify({ daysToKeep }),
    }),
};

export const patientsAPI = {
  getAll: (): Promise<Patient[]> => fetchAPI("/patients"),
  getOne: (id: string): Promise<Patient> => fetchAPI(`/patients/${id}`),
  create: (
    data: Omit<Patient, "id" | "createdAt" | "updatedAt">,
  ): Promise<Patient> =>
    fetchAPI("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<Omit<Patient, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Patient> =>
    fetchAPI(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string): Promise<void> =>
    fetchAPI(`/patients/${id}`, {
      method: "DELETE",
    }),
};

export const appointmentsAPI = {
  getAll: (): Promise<Appointment[]> => fetchAPI("/appointments"),
  getOne: (id: string): Promise<Appointment> => fetchAPI(`/appointments/${id}`),
  create: (
    data: Omit<Appointment, "id" | "createdAt" | "updatedAt">,
  ): Promise<Appointment> =>
    fetchAPI("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<Omit<Appointment, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Appointment> =>
    fetchAPI(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string): Promise<void> =>
    fetchAPI(`/appointments/${id}`, {
      method: "DELETE",
    }),
};

// Feedback types
export interface Feedback {
  id: string;
  clinicId: string;
  userId: string;
  overallRating: number;
  goodFeatures: string[];
  goodFeaturesReason?: string;
  badFeatures: string[];
  badFeaturesReason?: string;
  improvementAreas: string[];
  improvementReason?: string;
  featureRequests?: string;
  generalComments?: string;
  category: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  clinic: {
    id: string;
    name: string;
    tier: string;
  };
}

export interface FeedbackStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  averageRating: number;
  recentFeedback: number;
  topGoodFeatures: { feature: string; count: number }[];
  topBadFeatures: { feature: string; count: number }[];
  topImprovementAreas: { feature: string; count: number }[];
}

export interface FeedbackFilters {
  status?: string;
  category?: string;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
}

export const feedbackAPI = {
  getAll: (filters?: FeedbackFilters): Promise<Feedback[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.clinicId) params.append("clinicId", filters.clinicId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.minRating)
      params.append("minRating", String(filters.minRating));
    if (filters?.maxRating)
      params.append("maxRating", String(filters.maxRating));
    const queryString = params.toString();
    return fetchAPIWithAuth(
      `/feedback/all${queryString ? `?${queryString}` : ""}`,
    );
  },
  getStats: (clinicId?: string): Promise<FeedbackStats> =>
    fetchAPIWithAuth(
      `/feedback/stats${clinicId ? `?clinicId=${clinicId}` : ""}`,
    ),
  getOne: (id: string): Promise<Feedback> =>
    fetchAPIWithAuth(`/feedback/${id}`),
  updateStatus: (
    id: string,
    data: { status: string; adminNotes?: string },
  ): Promise<Feedback> =>
    fetchAPIWithAuth(`/feedback/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string): Promise<void> =>
    fetchAPIWithAuth(`/feedback/${id}`, {
      method: "DELETE",
    }),
};

// Billing types
export interface SubscriptionOverview {
  id: string;
  clinicId: string;
  tier: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
  currency: string;
  clinic: {
    id: string;
    name: string;
    email: string;
    tier: string;
    referralCreditsMonths: number;
  };
}

export interface BillingMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnRate: number;
  subscriptionsByTier: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
  expiringSubscriptions: SubscriptionOverview[];
  gracePeriodSubscriptions: SubscriptionOverview[];
  recentPayments: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  gatewayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
  subscription: {
    clinic: {
      id: string;
      name: string;
    };
    tier: string;
  };
}

export interface BillingFilters {
  tier?: string;
  status?: string;
  billingCycle?: string;
  startDate?: string;
  endDate?: string;
}

export const billingAPI = {
  getMetrics: (): Promise<BillingMetrics> =>
    fetchAPIWithAuth("/super-admin/billing/metrics"),
  getSubscriptions: (
    filters?: BillingFilters,
  ): Promise<SubscriptionOverview[]> => {
    const params = new URLSearchParams();
    if (filters?.tier) params.append("tier", filters.tier);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.billingCycle)
      params.append("billingCycle", filters.billingCycle);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    const queryString = params.toString();
    return fetchAPIWithAuth(
      `/super-admin/billing/subscriptions${queryString ? `?${queryString}` : ""}`,
    );
  },
  getExpiringSubscriptions: (days?: number): Promise<SubscriptionOverview[]> =>
    fetchAPIWithAuth(
      `/super-admin/billing/expiring${days ? `?days=${days}` : ""}`,
    ),
  getPayments: (filters?: {
    clinicId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaymentRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.clinicId) params.append("clinicId", filters.clinicId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    const queryString = params.toString();
    return fetchAPIWithAuth(
      `/super-admin/billing/payments${queryString ? `?${queryString}` : ""}`,
    );
  },
  sendReminder: (subscriptionId: string): Promise<void> =>
    fetchAPIWithAuth(
      `/super-admin/billing/subscriptions/${subscriptionId}/remind`,
      {
        method: "POST",
      },
    ),
  extendGracePeriod: (subscriptionId: string, days: number): Promise<void> =>
    fetchAPIWithAuth(
      `/super-admin/billing/subscriptions/${subscriptionId}/extend-grace`,
      {
        method: "POST",
        body: JSON.stringify({ days }),
      },
    ),
};

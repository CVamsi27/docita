import { client } from "./api-client";
import {
  Patient,
  Appointment,
  SuperAdminBillingPaymentsQuery,
  SuperAdminBillingSubscriptionsQuery,
} from "@workspace/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api/v1";

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
  getHealth: (): Promise<HealthCheckResult> => client.get("/health"),
  getLiveness: (): Promise<{ status: string }> => client.get("/health/live"),
  getReadiness: (): Promise<{ status: string; database: boolean }> =>
    client.get("/health/ready"),
};

export const monitoringAPI = {
  getDashboard: (clinicId?: string): Promise<MonitoringDashboard> =>
    client.get(`/monitoring/dashboard`, { params: { clinicId } }),
  getHealth: (): Promise<SystemHealth> => client.get("/monitoring/health"),
  getRequestStats: (
    startDate?: string,
    endDate?: string,
    clinicId?: string,
  ): Promise<RequestStats> => {
    return client.get("/monitoring/requests", {
      params: { startDate, endDate, clinicId },
    });
  },
  getErrorStats: (
    startDate?: string,
    endDate?: string,
    clinicId?: string,
  ): Promise<ErrorStats> => {
    return client.get("/monitoring/errors", {
      params: { startDate, endDate, clinicId },
    });
  },
  getPerformance: (
    startDate?: string,
    endDate?: string,
  ): Promise<PerformanceMetrics> => {
    return client.get("/monitoring/performance", {
      params: { startDate, endDate },
    });
  },
  resolveError: (
    errorId: string,
    resolvedBy: string,
  ): Promise<{ success: boolean }> =>
    client.post(`/monitoring/errors/${errorId}/resolve`, { resolvedBy }),
  resolveMultipleErrors: (
    errorIds: string[],
    resolvedBy: string,
  ): Promise<{ success: boolean; count: number }> =>
    client.post("/monitoring/errors/resolve-multiple", {
      errorIds,
      resolvedBy,
    }),
  cleanup: (
    daysToKeep?: number,
  ): Promise<{
    requestsDeleted: number;
    errorsDeleted: number;
    metricsDeleted: number;
  }> => client.post("/monitoring/cleanup", { daysToKeep }),
};

export const patientsAPI = {
  getAll: (): Promise<Patient[]> => client.get("/patients"),
  getOne: (id: string): Promise<Patient> => client.get(`/patients/${id}`),
  create: (
    data: Omit<Patient, "id" | "createdAt" | "updatedAt">,
  ): Promise<Patient> => client.post("/patients", data),
  update: (
    id: string,
    data: Partial<Omit<Patient, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Patient> => client.patch(`/patients/${id}`, data),
  delete: (id: string): Promise<void> => client.delete(`/patients/${id}`),
};

export const appointmentsAPI = {
  getAll: (): Promise<Appointment[]> => client.get("/appointments"),
  getOne: (id: string): Promise<Appointment> =>
    client.get(`/appointments/${id}`),
  create: (
    data: Omit<Appointment, "id" | "createdAt" | "updatedAt">,
  ): Promise<Appointment> => client.post("/appointments", data),
  update: (
    id: string,
    data: Partial<Omit<Appointment, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Appointment> => client.patch(`/appointments/${id}`, data),
  delete: (id: string): Promise<void> => client.delete(`/appointments/${id}`),
};

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
  user: { id: string; name: string; email: string; role: string };
  clinic: { id: string; name: string; tier: string };
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

export const feedbackAPI = {
  getAll: (
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<Feedback[]> =>
    client.get("/super-admin/feedback/all", { params: filters }),
  getStats: (clinicId?: string): Promise<FeedbackStats> =>
    client.get("/super-admin/feedback/stats", { params: { clinicId } }),
  getOne: (id: string): Promise<Feedback> =>
    client.get(`/super-admin/feedback/${id}`),
  updateStatus: (
    id: string,
    data: Record<string, unknown>,
  ): Promise<Feedback> => client.patch(`/super-admin/feedback/${id}/status`, data),
  delete: (id: string): Promise<void> =>
    client.delete(`/super-admin/feedback/${id}`),
};

export interface SubscriptionOverview {
  id: string;
  clinic: {
    name: string;
    email: string;
    referralCreditsMonths: number;
  };
  tier: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  gatewayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
  subscription: {
    clinic: { name: string };
    tier: string;
  };
}

export interface BillingMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnRate: number;
  expiringSubscriptions: SubscriptionOverview[];
  gracePeriodSubscriptions: SubscriptionOverview[];
  subscriptionsByTier: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
}

export const billingAPI = {
  getMetrics: (): Promise<BillingMetrics> =>
    client.get("/super-admin/billing/metrics"),
  getSubscriptions: (
    filters?: SuperAdminBillingSubscriptionsQuery,
  ): Promise<SubscriptionOverview[]> =>
    client.get("/super-admin/billing/subscriptions", { params: filters }),
  getExpiringSubscriptions: (days?: number): Promise<SubscriptionOverview[]> =>
    client.get("/super-admin/billing/expiring", { params: { days } }),
  getPayments: (
    filters?: SuperAdminBillingPaymentsQuery,
  ): Promise<PaymentRecord[]> =>
    client.get("/super-admin/billing/payments", { params: filters }),
  sendReminder: (subscriptionId: string): Promise<void> =>
    client.post(`/super-admin/billing/subscriptions/${subscriptionId}/remind`),
  extendGracePeriod: (subscriptionId: string, days: number): Promise<void> =>
    client.post(
      `/super-admin/billing/subscriptions/${subscriptionId}/extend-grace`,
      { days },
    ),
};

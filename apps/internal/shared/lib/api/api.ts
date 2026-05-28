import { client } from "./api-client";
import {
  CreateWhatsAppBroadcastJobRequest,
  InternalBillingPaymentItem,
  InternalBillingPaymentsQuery,
  InternalBillingSubscriptionsQuery,
  SupportInquiry,
  SupportWhatsAppMessage,
  SupportWhatsAppReplyRequest,
  SupportWhatsAppThreadSummary,
  WhatsAppBroadcastJobDetail,
  WhatsAppBroadcastJobSummary,
} from "@workspace/types";

interface Feedback {
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

interface FeedbackStats {
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
    client.get("/internal/feedback/all", { params: filters }),
  getStats: (clinicId?: string): Promise<FeedbackStats> =>
    client.get("/internal/feedback/stats", { params: { clinicId } }),
  getOne: (id: string): Promise<Feedback> =>
    client.get(`/internal/feedback/${id}`),
  updateStatus: (
    id: string,
    data: Record<string, unknown>,
  ): Promise<Feedback> => client.patch(`/internal/feedback/${id}/status`, data),
  delete: (id: string): Promise<void> =>
    client.delete(`/internal/feedback/${id}`),
};

export const supportAPI = {
  getInquiries: (limit = 100): Promise<SupportInquiry[]> =>
    client.get(`/internal/support/inquiries?limit=${limit}`),
  getWhatsAppThreads: (
    limit = 100,
  ): Promise<SupportWhatsAppThreadSummary[]> =>
    client.get(`/internal/support/whatsapp?limit=${limit}`),
  getWhatsAppThreadMessages: (
    threadPhoneNumber: string,
    limit = 500,
  ): Promise<SupportWhatsAppMessage[]> =>
    client.get(
      `/internal/support/whatsapp/${encodeURIComponent(threadPhoneNumber)}/messages?limit=${limit}`,
    ),
  markWhatsAppThreadRead: (
    threadPhoneNumber: string,
  ): Promise<{ updatedCount: number }> =>
    client.patch(
      `/internal/support/whatsapp/${encodeURIComponent(threadPhoneNumber)}/read`,
      {},
    ),
  replyToWhatsAppThread: (
    threadPhoneNumber: string,
    data: SupportWhatsAppReplyRequest,
  ): Promise<SupportWhatsAppMessage> =>
    client.post(
      `/internal/support/whatsapp/${encodeURIComponent(threadPhoneNumber)}/reply`,
      data,
    ),
};

export const broadcastsAPI = {
  list: (limit = 50): Promise<WhatsAppBroadcastJobSummary[]> =>
    client.get(`/internal/broadcasts?limit=${limit}`),
  get: (id: string): Promise<WhatsAppBroadcastJobDetail> =>
    client.get(`/internal/broadcasts/${encodeURIComponent(id)}`),
  create: (
    data: CreateWhatsAppBroadcastJobRequest,
  ): Promise<WhatsAppBroadcastJobSummary> =>
    client.post("/internal/broadcasts", data),
};

interface SubscriptionOverview {
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

type PaymentRecord = InternalBillingPaymentItem;

interface BillingMetrics {
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

interface TierPricingRow {
  id: string;
  tier: string;
  name: string;
  description: string;
  tagline: string;
  color: string;
  displayOrder: number;
  monthlyBasePriceCents: number;
  includedPatients: number;
  includedAppointments: number;
  includedStorageGB: number;
  includedUsers: number;
  overagePatientCents: number;
  overageAppointmentCents: number;
  overageStorageCents: number;
  overageUserCents: number;
  overagePrescriptionCents: number;
  overageInvoiceCents: number;
  overageOcrPageCents: number;
  overageApiCallCents: number;
  isActive: boolean;
}

export interface PricingOfferRow {
  id: string;
  clinicId: string;
  clinic?: {
    id: string;
    name: string;
    email: string;
    tier: string;
  };
  title: string;
  description: string;
  percentOff: number;
  durationMonths?: number;
  validUntil?: string;
  notes?: string;
  updatedAt?: string;
}

export const billingAPI = {
  getMetrics: (): Promise<BillingMetrics> =>
    client.get("/internal/billing/metrics"),
  getSubscriptions: (
    filters?: InternalBillingSubscriptionsQuery,
  ): Promise<SubscriptionOverview[]> =>
    client.get("/internal/billing/subscriptions", { params: filters }),
  getExpiringSubscriptions: (days?: number): Promise<SubscriptionOverview[]> =>
    client.get("/internal/billing/expiring", { params: { days } }),
  getPayments: (
    filters?: InternalBillingPaymentsQuery,
  ): Promise<PaymentRecord[]> =>
    client.get("/internal/billing/payments", { params: filters }),
  sendReminder: (subscriptionId: string): Promise<void> =>
    client.post(`/internal/billing/subscriptions/${subscriptionId}/remind`),
  extendGracePeriod: (subscriptionId: string, days: number): Promise<void> =>
    client.post(
      `/internal/billing/subscriptions/${subscriptionId}/extend-grace`,
      { days },
    ),
  getPricingTiers: (): Promise<TierPricingRow[]> =>
    client.get("/internal/billing/pricing/tiers"),
  updatePricingTier: (
    tierId: string,
    data: Partial<TierPricingRow>,
  ): Promise<TierPricingRow> =>
    client.put(`/internal/billing/pricing/tiers/${tierId}`, data),
  getPricingOffers: (): Promise<PricingOfferRow[]> =>
    client.get("/internal/billing/pricing/offers"),
  upsertPricingOffer: (
    clinicId: string,
    data: Partial<PricingOfferRow>,
  ): Promise<PricingOfferRow> =>
    client.put(`/internal/billing/pricing/offers/${clinicId}`, data),
  deletePricingOffer: (clinicId: string): Promise<void> =>
    client.delete(`/internal/billing/pricing/offers/${clinicId}`),
};

interface EnterpriseContractRow {
  id: string;
  primaryClinicId: string;
  groupName: string | null;
  memberClinicIds: string[];
  contractNumber: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";
  startDate: string;
  endDate: string;
  billingCycle: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "YEARLY";
  currency: string;
  platformFeeCents: number;
  includedUsers: number;
  includedConsultations: number;
  includedWhatsappMessages: number;
  includedStorageGB: number;
  includedBranches: number;
  includedDoctors: number;
  includedPrescriptions: number;
  includedInvoices: number;
  overageUserCents: number;
  overageConsultationCents: number;
  overageWhatsappCents: number;
  overageStorageCents: number;
  overageDoctorCents: number;
  overagePrescriptionCents: number;
  overageInvoiceCents: number;
  setupFeeCents: number;
  dedicatedSupportCents: number;
  customLineItems: EnterpriseCustomLineItem[];
  annualPrepayDiscountPercent: number;
  trueUpThresholdPercent: number;
  notes: string | null;
  signedDocumentUrl: string | null;
  lastTrueUpAlertAt: string | null;
  annualPrepayInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EnterpriseCustomLineItem {
  key: string;
  label: string;
  includedQty: number;
  unitCents: number;
  usageType?:
    | "DOCTORS"
    | "CONSULTATIONS"
    | "WHATSAPP_MESSAGES"
    | "PRESCRIPTIONS"
    | "INVOICES";
  source: "USAGE_RECORD" | "MANUAL";
  enabled: boolean;
}

interface EnterpriseContractInvoiceRow {
  id: string;
  contractId: string;
  kind: "ANNUAL_PREPAY" | "TRUE_UP" | "ADJUSTMENT";
  subscriptionPaymentId: string | null;
  amountCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  discountPercent: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  subscriptionPayment?: { invoiceUrl: string | null; status: string } | null;
}

interface EnterpriseTrueUpAlertRow {
  id: string;
  contractId: string;
  alertedAt: string;
  thresholdPercent: number;
  observedPercent: number;
  ytdOverageCents: number;
  ytdPlatformCents: number;
  recipients: string[];
}

interface EnterpriseContractEstimate {
  contract: EnterpriseContractRow & { memberClinicIds: string[] };
  period: { start: string; end: string };
  meters: {
    users: { current: number; included: number; overage: number; chargeCents: number };
    consultations: { current: number; included: number; overage: number; chargeCents: number };
    whatsappMessages: { current: number; included: number; overage: number; chargeCents: number };
    storageGB: { current: number; included: number; overage: number; chargeCents: number };
    doctors: { current: number; included: number; overage: number; chargeCents: number };
    prescriptions: { current: number; included: number; overage: number; chargeCents: number };
    invoices: { current: number; included: number; overage: number; chargeCents: number };
  };
  platformFeeCents: number;
  setupFeeCents: number;
  dedicatedSupportCents: number;
  overageTotalCents: number;
  projectedMonthTotalCents: number;
  currency: string;
}

interface EnterpriseContractInvoicePreview {
  period: { start: string; end: string };
  currency: string;
  lines: Array<{
    key: string;
    label: string;
    quantity: number;
    included: number;
    overage: number;
    unitCents: number;
    chargeCents: number;
    source: "SYSTEM" | "CUSTOM";
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

interface EnterpriseContractRevisionRow {
  id: string;
  contractId: string;
  effectiveDate: string;
  changeSummary: string;
  createdById: string | null;
  createdAt: string;
}

export const enterpriseContractsAPI = {
  list: (): Promise<EnterpriseContractRow[]> =>
    client.get("/internal/enterprise-contracts"),
  get: (contractId: string): Promise<EnterpriseContractRow> =>
    client.get(`/internal/enterprise-contracts/${contractId}`),
  getByClinic: (clinicId: string): Promise<EnterpriseContractRow> =>
    client.get(`/internal/enterprise-contracts/by-clinic/${clinicId}`),
  upsert: (
    primaryClinicId: string,
    payload: Partial<EnterpriseContractRow> & { changeSummary?: string },
  ): Promise<EnterpriseContractRow> =>
    client.put(
      `/internal/enterprise-contracts/by-primary-clinic/${primaryClinicId}`,
      payload,
    ),
  setStatus: (
    contractId: string,
    status: EnterpriseContractRow["status"],
  ): Promise<EnterpriseContractRow> =>
    client.post(`/internal/enterprise-contracts/${contractId}/status`, {
      status,
    }),
  addMember: (
    contractId: string,
    clinicId: string,
  ): Promise<EnterpriseContractRow> =>
    client.post(`/internal/enterprise-contracts/${contractId}/members`, {
      clinicId,
    }),
  removeMember: (
    contractId: string,
    clinicId: string,
  ): Promise<EnterpriseContractRow> =>
    client.delete(
      `/internal/enterprise-contracts/${contractId}/members/${clinicId}`,
    ),
  listRevisions: (contractId: string): Promise<EnterpriseContractRevisionRow[]> =>
    client.get(`/internal/enterprise-contracts/${contractId}/revisions`),
  listInvoices: (contractId: string): Promise<EnterpriseContractInvoiceRow[]> =>
    client.get(`/internal/enterprise-contracts/${contractId}/invoices`),
  listTrueUpAlerts: (
    contractId: string,
  ): Promise<EnterpriseTrueUpAlertRow[]> =>
    client.get(`/internal/enterprise-contracts/${contractId}/true-up-alerts`),
  generateAnnualPrepayInvoice: (
    contractId: string,
  ): Promise<EnterpriseContractInvoiceRow> =>
    client.post(
      `/internal/enterprise-contracts/${contractId}/annual-prepay-invoice`,
    ),
  evaluateTrueUp: (
    contractId: string,
  ): Promise<{ alerted: boolean; observedPercent: number }> =>
    client.post(`/internal/enterprise-contracts/${contractId}/evaluate-true-up`),
  estimate: (contractId: string): Promise<EnterpriseContractEstimate> =>
    client.get(`/internal/enterprise-contracts/${contractId}/estimate`),
  previewInvoice: (
    contractId: string,
  ): Promise<EnterpriseContractInvoicePreview> =>
    client.post(
      `/internal/enterprise-contracts/${contractId}/invoice-preview`,
    ),
  terminate: (contractId: string): Promise<void> =>
    client.delete(`/internal/enterprise-contracts/${contractId}`),
};

export interface InternalEnterpriseCustomLineItem {
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

export interface InternalEnterpriseContractRow {
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
  customLineItems: InternalEnterpriseCustomLineItem[];
  annualPrepayDiscountPercent: number;
  trueUpThresholdPercent: number;
  notes: string | null;
  signedDocumentUrl: string | null;
  lastTrueUpAlertAt: string | null;
  annualPrepayInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InternalEnterpriseContractInvoiceRow {
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

export interface InternalEnterpriseTrueUpAlertRow {
  id: string;
  contractId: string;
  alertedAt: string;
  thresholdPercent: number;
  observedPercent: number;
  ytdOverageCents: number;
  ytdPlatformCents: number;
  recipients: string[];
}

export interface InternalEnterpriseContractEstimate {
  contract: InternalEnterpriseContractRow & { memberClinicIds: string[] };
  period: { start: string; end: string };
  meters: {
    users: {
      current: number;
      included: number;
      overage: number;
      chargeCents: number;
    };
    consultations: {
      current: number;
      included: number;
      overage: number;
      chargeCents: number;
    };
    whatsappMessages: {
      current: number;
      included: number;
      overage: number;
      chargeCents: number;
    };
    storageGB: {
      current: number;
      included: number;
      overage: number;
      chargeCents: number;
    };
    doctors: {
      current: number;
      included: number;
      overage: number;
      chargeCents: number;
    };
    prescriptions: {
      current: number;
      included: number;
      overage: number;
      chargeCents: number;
    };
    invoices: {
      current: number;
      included: number;
      overage: number;
      chargeCents: number;
    };
  };
  platformFeeCents: number;
  setupFeeCents: number;
  dedicatedSupportCents: number;
  overageTotalCents: number;
  projectedMonthTotalCents: number;
  currency: string;
}

export interface InternalEnterpriseContractRevisionRow {
  id: string;
  contractId: string;
  effectiveDate: string;
  changeSummary: string;
  createdById: string | null;
  createdAt: string;
}

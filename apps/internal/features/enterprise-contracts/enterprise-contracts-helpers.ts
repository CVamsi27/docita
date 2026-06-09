import type { InternalEnterpriseContractRow as EnterpriseContractRow } from "@workspace/data-access/internal";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";
import { enterpriseContractStatusSchema } from "@workspace/types";
import { getUserFacingErrorMessage } from "@workspace/utils";

export type ContractFormState = {
  primaryClinicId: string;
  groupName: string;
  contractNumber: string;
  status: EnterpriseContractRow["status"];
  startDate: string;
  endDate: string;
  billingCycle: EnterpriseContractRow["billingCycle"];
  currency: string;
  platformFeeINR: string;
  includedUsers: string;
  includedConsultations: string;
  includedWhatsappMessages: string;
  includedStorageGB: string;
  includedBranches: string;
  includedDoctors: string;
  includedPrescriptions: string;
  includedInvoices: string;
  overageUserINR: string;
  overageConsultationINR: string;
  overageWhatsappINR: string;
  overageStorageINR: string;
  overageDoctorINR: string;
  overagePrescriptionINR: string;
  overageInvoiceINR: string;
  setupFeeINR: string;
  dedicatedSupportINR: string;
  annualPrepayDiscountPercent: string;
  trueUpThresholdPercent: string;
  notes: string;
  signedDocumentUrl: string;
  changeSummary: string;
};

export const BLANK_ENTERPRISE_CONTRACT_FORM: ContractFormState = {
  primaryClinicId: "",
  groupName: "",
  contractNumber: "",
  status: "DRAFT",
  startDate: "",
  endDate: "",
  billingCycle: "MONTHLY",
  currency: "INR",
  platformFeeINR: "",
  includedUsers: "0",
  includedConsultations: "0",
  includedWhatsappMessages: "0",
  includedStorageGB: "0",
  includedBranches: "1",
  includedDoctors: "0",
  includedPrescriptions: "0",
  includedInvoices: "0",
  overageUserINR: "0",
  overageConsultationINR: "0",
  overageWhatsappINR: "0",
  overageStorageINR: "0",
  overageDoctorINR: "0",
  overagePrescriptionINR: "0",
  overageInvoiceINR: "0",
  setupFeeINR: "0",
  dedicatedSupportINR: "0",
  annualPrepayDiscountPercent: "0",
  trueUpThresholdPercent: "130",
  notes: "",
  signedDocumentUrl: "",
  changeSummary: "",
};

export const ENTERPRISE_QUOTE_PRESETS = {
  MID_ENTERPRISE: {
    label: "Mid-Enterprise (~10 doctors, multi-branch)",
    platformFeeINR: "25000",
    includedUsers: "50",
    includedConsultations: "20000",
    includedWhatsappMessages: "30000",
    includedStorageGB: "250",
    includedBranches: "5",
    includedDoctors: "10",
    includedPrescriptions: "10000",
    includedInvoices: "10000",
    overageUserINR: "199",
    overageConsultationINR: "1.5",
    overageWhatsappINR: "0.30",
    overageStorageINR: "0",
    overageDoctorINR: "499",
    overagePrescriptionINR: "0.25",
    overageInvoiceINR: "0.25",
    setupFeeINR: "50000",
    dedicatedSupportINR: "0",
  },
  MULTI_SITE: {
    label: "Multi-site (10–30 branches)",
    platformFeeINR: "75000",
    includedUsers: "200",
    includedConsultations: "80000",
    includedWhatsappMessages: "100000",
    includedStorageGB: "750",
    includedBranches: "30",
    includedDoctors: "30",
    includedPrescriptions: "40000",
    includedInvoices: "40000",
    overageUserINR: "149",
    overageConsultationINR: "1.25",
    overageWhatsappINR: "0.25",
    overageStorageINR: "0",
    overageDoctorINR: "399",
    overagePrescriptionINR: "0.20",
    overageInvoiceINR: "0.20",
    setupFeeINR: "150000",
    dedicatedSupportINR: "0",
  },
  NETWORK: {
    label: "Network/Group (>30 branches)",
    platformFeeINR: "200000",
    includedUsers: "500",
    includedConsultations: "250000",
    includedWhatsappMessages: "300000",
    includedStorageGB: "2000",
    includedBranches: "100",
    includedDoctors: "100",
    includedPrescriptions: "125000",
    includedInvoices: "125000",
    overageUserINR: "99",
    overageConsultationINR: "1.0",
    overageWhatsappINR: "0.20",
    overageStorageINR: "0",
    overageDoctorINR: "299",
    overagePrescriptionINR: "0.15",
    overageInvoiceINR: "0.15",
    setupFeeINR: "500000",
    dedicatedSupportINR: "0",
  },
} as const;

export type EnterpriseQuotePresetKey = keyof typeof ENTERPRISE_QUOTE_PRESETS;

export const ENTERPRISE_QUOTE_PRESET_KEYS: EnterpriseQuotePresetKey[] = [
  "MID_ENTERPRISE",
  "MULTI_SITE",
  "NETWORK",
];

export const ENTERPRISE_CONTRACT_STATUSES =
  enterpriseContractStatusSchema.options;

export const ENTERPRISE_BILLING_CYCLES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "YEARLY",
] as const;

export const enterpriseContractStatusBadgeClass: Record<
  EnterpriseContractRow["status"],
  string
> = {
  DRAFT: "badge-muted",
  ACTIVE: "badge-success",
  EXPIRED: "badge-warning",
  TERMINATED: "badge-danger",
};

export function inrToCents(inr: string): number {
  const n = Number(inr.trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToInr(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export function enterpriseContractRowToForm(
  row: EnterpriseContractRow,
): ContractFormState {
  return {
    primaryClinicId: row.primaryClinicId,
    groupName: row.groupName ?? "",
    contractNumber: row.contractNumber,
    status: row.status,
    startDate: row.startDate.slice(0, 10),
    endDate: row.endDate.slice(0, 10),
    billingCycle: row.billingCycle,
    currency: row.currency,
    platformFeeINR: centsToInr(row.platformFeeCents),
    includedUsers: String(row.includedUsers),
    includedConsultations: String(row.includedConsultations),
    includedWhatsappMessages: String(row.includedWhatsappMessages),
    includedStorageGB: String(row.includedStorageGB),
    includedBranches: String(row.includedBranches),
    includedDoctors: String(row.includedDoctors ?? 0),
    includedPrescriptions: String(row.includedPrescriptions ?? 0),
    includedInvoices: String(row.includedInvoices ?? 0),
    overageUserINR: centsToInr(row.overageUserCents),
    overageConsultationINR: centsToInr(row.overageConsultationCents),
    overageWhatsappINR: centsToInr(row.overageWhatsappCents),
    overageStorageINR: centsToInr(row.overageStorageCents),
    overageDoctorINR: centsToInr(row.overageDoctorCents ?? 0),
    overagePrescriptionINR: centsToInr(row.overagePrescriptionCents ?? 0),
    overageInvoiceINR: centsToInr(row.overageInvoiceCents ?? 0),
    setupFeeINR: centsToInr(row.setupFeeCents ?? 0),
    dedicatedSupportINR: centsToInr(row.dedicatedSupportCents ?? 0),
    annualPrepayDiscountPercent: String(row.annualPrepayDiscountPercent),
    trueUpThresholdPercent: String(row.trueUpThresholdPercent),
    notes: row.notes ?? "",
    signedDocumentUrl: row.signedDocumentUrl ?? "",
    changeSummary: "",
  };
}

export function buildEnterpriseContractUpsertPayload(form: ContractFormState) {
  return {
    contractNumber: form.contractNumber,
    groupName: form.groupName.trim() || null,
    status: form.status,
    startDate: new Date(form.startDate).toISOString(),
    endDate: new Date(form.endDate).toISOString(),
    billingCycle: form.billingCycle,
    currency: form.currency,
    platformFeeCents: inrToCents(form.platformFeeINR),
    includedUsers: Number(form.includedUsers) || 0,
    includedConsultations: Number(form.includedConsultations) || 0,
    includedWhatsappMessages: Number(form.includedWhatsappMessages) || 0,
    includedStorageGB: Number(form.includedStorageGB) || 0,
    includedBranches: Number(form.includedBranches) || 1,
    includedDoctors: Number(form.includedDoctors) || 0,
    includedPrescriptions: Number(form.includedPrescriptions) || 0,
    includedInvoices: Number(form.includedInvoices) || 0,
    overageUserCents: inrToCents(form.overageUserINR),
    overageConsultationCents: inrToCents(form.overageConsultationINR),
    overageWhatsappCents: inrToCents(form.overageWhatsappINR),
    overageStorageCents: inrToCents(form.overageStorageINR),
    overageDoctorCents: inrToCents(form.overageDoctorINR),
    overagePrescriptionCents: inrToCents(form.overagePrescriptionINR),
    overageInvoiceCents: inrToCents(form.overageInvoiceINR),
    setupFeeCents: inrToCents(form.setupFeeINR),
    dedicatedSupportCents: inrToCents(form.dedicatedSupportINR),
    customLineItems: [],
    annualPrepayDiscountPercent: Number(form.annualPrepayDiscountPercent) || 0,
    trueUpThresholdPercent: Number(form.trueUpThresholdPercent) || 130,
    notes: form.notes || null,
    signedDocumentUrl: form.signedDocumentUrl || null,
    changeSummary: form.changeSummary || undefined,
  } satisfies Partial<EnterpriseContractRow> & { changeSummary?: string };
}

// --- Pure computed values extracted from the hook ---

export function computeContractTotals(rows: EnterpriseContractRow[]) {
  const active = rows.filter((r) => r.status === "ACTIVE");
  const platformFeeMrr = active.reduce((sum, r) => sum + r.platformFeeCents, 0);
  return {
    total: rows.length,
    active: active.length,
    draft: rows.filter((r) => r.status === "DRAFT").length,
    mrrCents: platformFeeMrr,
  };
}

export function deriveContractsLoadError(
  isError: boolean,
  error: unknown,
): string | null {
  if (!isError) return null;
  return getUserFacingErrorMessage(error, {
    context: "load",
    fallback: "We could not load enterprise contracts. Please try again.",
  });
}

export function deriveContractsTableStatus(
  loading: boolean,
  loadError: string | null,
  rows: unknown[],
): DataStateStatus {
  if (loading) return "loading";
  if (loadError) return "error";
  return rows.length === 0 ? "empty" : "success";
}

export function validateContractForm(form: ContractFormState): string | null {
  if (
    !form.primaryClinicId ||
    !form.contractNumber ||
    !form.startDate ||
    !form.endDate
  ) return "primaryClinicId, contractNumber, start and end dates are required";
  return null;
}

export const MINIMUM_SETUP_FEE_INR = 2500;
export const SETUP_FEE_MINIMUM_ERROR =
  "Setup fee must be at least ₹2,500 before raising an invoice.";

export const LOAD_CONTRACTS_ERROR =
  "We couldn't load enterprise contracts. Please try again.";
export const SAVE_CONTRACT_ERROR =
  "We couldn't save the contract. Please try again.";
export const LOAD_ESTIMATE_ERROR =
  "We couldn't load the estimate. Please try again.";
export const LOAD_REVISIONS_ERROR =
  "We couldn't load revisions. Please try again.";
export const ADD_CLINIC_ERROR =
  "We couldn't add that clinic. Please try again.";
export const REMOVE_CLINIC_ERROR =
  "We couldn't remove that clinic. Please try again.";
export const PREPAY_ERROR =
  "We couldn't generate the prepay invoice. Please try again.";
export const SETUP_FEE_INVOICE_ERROR =
  "We couldn't generate the setup fee invoice. Please try again.";
export const ADJUSTMENT_INVOICE_ERROR =
  "We couldn't generate the custom bill. Please try again.";
export const LOAD_INVOICES_ERROR =
  "We couldn't load invoices. Please try again.";
export const TRUEUP_ERROR = "We couldn't evaluate true-up. Please try again.";
export const LOAD_ALERTS_ERROR = "We couldn't load alerts. Please try again.";

export const CANNOT_REMOVE_PRIMARY_CLINIC_ERROR =
  "Cannot remove the primary clinic";

export function formatPrepayResult(inv: {
  id: string;
  amountCents: number;
  discountPercent: number;
}): string {
  return `Prepay invoice generated: ${inv.id}\nAmount: ₹${(inv.amountCents / 100).toFixed(2)}\nDiscount: ${inv.discountPercent}%`;
}

export function formatSetupFeeResult(inv: {
  id: string;
  amountCents: number;
}): string {
  return `Setup fee invoice generated: ${inv.id} for ₹${(inv.amountCents / 100).toFixed(2)}`;
}

export function formatAdjustmentResult(inv: {
  id: string;
  amountCents: number;
}): string {
  return `Custom bill generated: ${inv.id} for ₹${(inv.amountCents / 100).toFixed(2)}`;
}

export function formatEvaluateTrueUpResult(res: {
  alerted: boolean;
  observedPercent: number;
}): string {
  return res.alerted
    ? `True-up alert raised: ${res.observedPercent}% of commit (recipients emailed).`
    : `No alert: usage at ${res.observedPercent}% (below threshold or already alerted this month).`;
}

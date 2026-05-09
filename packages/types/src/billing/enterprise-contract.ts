import { z } from "zod";

const billingCycleSchema = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "YEARLY",
]);

export const enterpriseContractStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
]);
export type EnterpriseContractStatusName = z.infer<
  typeof enterpriseContractStatusSchema
>;

export const enterpriseContractSchema = z.object({
  id: z.string(),
  primaryClinicId: z.string(),
  groupName: z.string().nullable().optional(),
  memberClinicIds: z.array(z.string()).default([]),
  contractNumber: z.string(),
  status: enterpriseContractStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  billingCycle: billingCycleSchema,
  currency: z.string(),

  platformFeeCents: z.number().int().nonnegative(),
  includedUsers: z.number().int().nonnegative(),
  includedConsultations: z.number().int().nonnegative(),
  includedWhatsappMessages: z.number().int().nonnegative(),
  includedStorageGB: z.number().int().nonnegative(),
  includedBranches: z.number().int().nonnegative(),

  overageUserCents: z.number().int().nonnegative(),
  overageConsultationCents: z.number().int().nonnegative(),
  overageWhatsappCents: z.number().int().nonnegative(),
  overageStorageCents: z.number().int().nonnegative(),

  annualPrepayDiscountPercent: z.number().int().min(0).max(100),
  trueUpThresholdPercent: z.number().int().min(100).max(300),
  notes: z.string().nullable().optional(),
  signedDocumentUrl: z.string().nullable().optional(),
  lastTrueUpAlertAt: z.string().nullable().optional(),
  annualPrepayInvoiceId: z.string().nullable().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EnterpriseContract = z.infer<typeof enterpriseContractSchema>;

export const upsertEnterpriseContractRequestSchema = z.object({
  contractNumber: z.string().min(3).max(64),
  groupName: z.string().max(120).nullable().optional(),
  status: enterpriseContractStatusSchema.optional(),
  startDate: z.string(),
  endDate: z.string(),
  billingCycle: billingCycleSchema.optional(),
  currency: z.string().length(3),

  platformFeeCents: z.number().int().nonnegative(),
  includedUsers: z.number().int().nonnegative(),
  includedConsultations: z.number().int().nonnegative(),
  includedWhatsappMessages: z.number().int().nonnegative(),
  includedStorageGB: z.number().int().nonnegative(),
  includedBranches: z.number().int().nonnegative(),

  overageUserCents: z.number().int().nonnegative(),
  overageConsultationCents: z.number().int().nonnegative(),
  overageWhatsappCents: z.number().int().nonnegative(),
  overageStorageCents: z.number().int().nonnegative(),

  annualPrepayDiscountPercent: z.number().int().min(0).max(100).optional(),
  trueUpThresholdPercent: z.number().int().min(100).max(300).optional(),
  notes: z.string().max(2000).nullable().optional(),
  signedDocumentUrl: z.string().url().max(500).nullable().optional(),
  changeSummary: z.string().max(500).optional(),
});
export type UpsertEnterpriseContractRequest = z.infer<
  typeof upsertEnterpriseContractRequestSchema
>;

export const enterpriseContractRevisionSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  effectiveDate: z.string(),
  changeSummary: z.string(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
});
export type EnterpriseContractRevision = z.infer<
  typeof enterpriseContractRevisionSchema
>;

export const ENTERPRISE_QUOTE_PRESETS = {
  MID_ENTERPRISE: {
    label: "Mid-Enterprise (~10 doctors, multi-branch)",
    platformFeeCents: 25_000_00,
    includedUsers: 50,
    includedConsultations: 20_000,
    includedWhatsappMessages: 30_000,
    includedStorageGB: 250,
    includedBranches: 5,
    overageUserCents: 199_00,
    overageConsultationCents: 1_50,
    overageWhatsappCents: 30,
    overageStorageCents: 0,
  },
  MULTI_SITE: {
    label: "Multi-site (10–30 branches)",
    platformFeeCents: 75_000_00,
    includedUsers: 200,
    includedConsultations: 80_000,
    includedWhatsappMessages: 100_000,
    includedStorageGB: 750,
    includedBranches: 30,
    overageUserCents: 149_00,
    overageConsultationCents: 1_25,
    overageWhatsappCents: 25,
    overageStorageCents: 0,
  },
  NETWORK: {
    label: "Network/Group (>30 branches)",
    platformFeeCents: 200_000_00,
    includedUsers: 500,
    includedConsultations: 250_000,
    includedWhatsappMessages: 300_000,
    includedStorageGB: 2000,
    includedBranches: 100,
    overageUserCents: 99_00,
    overageConsultationCents: 1_00,
    overageWhatsappCents: 20,
    overageStorageCents: 0,
  },
} as const;

export type EnterpriseQuotePresetKey = keyof typeof ENTERPRISE_QUOTE_PRESETS;

export const enterpriseContractEstimateSchema = z.object({
  contract: enterpriseContractSchema,
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  meters: z.object({
    users: z.object({
      current: z.number(),
      included: z.number(),
      overage: z.number(),
      chargeCents: z.number(),
    }),
    consultations: z.object({
      current: z.number(),
      included: z.number(),
      overage: z.number(),
      chargeCents: z.number(),
    }),
    whatsappMessages: z.object({
      current: z.number(),
      included: z.number(),
      overage: z.number(),
      chargeCents: z.number(),
    }),
    storageGB: z.object({
      current: z.number(),
      included: z.number(),
      overage: z.number(),
      chargeCents: z.number(),
    }),
  }),
  platformFeeCents: z.number(),
  overageTotalCents: z.number(),
  projectedMonthTotalCents: z.number(),
  currency: z.string(),
});
export type EnterpriseContractEstimate = z.infer<
  typeof enterpriseContractEstimateSchema
>;

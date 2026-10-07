import { z } from "zod";
import { jsonObjectSchema } from "../shared/json-schema";

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

export const enterpriseCustomLineItemSchema = z
  .object({
    key: z
      .string()
      .regex(/^[a-z0-9_:-]+$/)
      .max(80),
    label: z.string().min(1).max(120),
    includedQty: z.number().int().nonnegative(),
    unitCents: z.number().int().nonnegative(),
    usageType: z
      .enum([
        "DOCTORS",
        "CONSULTATIONS",
        "WHATSAPP_MESSAGES",
        "PRESCRIPTIONS",
        "INVOICES",
      ])
      .optional(),
    source: z.enum(["USAGE_RECORD", "MANUAL"]).default("USAGE_RECORD"),
    enabled: z.boolean().default(true),
  })
  .strict();
export type EnterpriseCustomLineItem = z.infer<
  typeof enterpriseCustomLineItemSchema
>;

/** Prisma `EnterpriseContract.customLineItems`. */
export const enterpriseContractCustomLineItemsJsonSchema = z.array(
  enterpriseCustomLineItemSchema,
);

/** Prisma `EnterpriseContractRevision.snapshot`. */
export const enterpriseContractRevisionSnapshotJsonSchema = jsonObjectSchema;

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
  includedDoctors: z.number().int().nonnegative().default(0),
  includedPrescriptions: z.number().int().nonnegative().default(0),
  includedInvoices: z.number().int().nonnegative().default(0),

  overageUserCents: z.number().int().nonnegative(),
  overageConsultationCents: z.number().int().nonnegative(),
  overageWhatsappCents: z.number().int().nonnegative(),
  overageStorageCents: z.number().int().nonnegative(),
  overageDoctorCents: z.number().int().nonnegative().default(0),
  overagePrescriptionCents: z.number().int().nonnegative().default(0),
  overageInvoiceCents: z.number().int().nonnegative().default(0),
  setupFeeCents: z.number().int().nonnegative().default(0),
  dedicatedSupportCents: z.number().int().nonnegative().default(0),
  customLineItems: z.array(enterpriseCustomLineItemSchema).default([]),

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
  includedDoctors: z.number().int().nonnegative().optional(),
  includedPrescriptions: z.number().int().nonnegative().optional(),
  includedInvoices: z.number().int().nonnegative().optional(),

  overageUserCents: z.number().int().nonnegative(),
  overageConsultationCents: z.number().int().nonnegative(),
  overageWhatsappCents: z.number().int().nonnegative(),
  overageStorageCents: z.number().int().nonnegative(),
  overageDoctorCents: z.number().int().nonnegative().optional(),
  overagePrescriptionCents: z.number().int().nonnegative().optional(),
  overageInvoiceCents: z.number().int().nonnegative().optional(),
  setupFeeCents: z.number().int().nonnegative().optional(),
  dedicatedSupportCents: z.number().int().nonnegative().optional(),
  customLineItems: z.array(enterpriseCustomLineItemSchema).optional(),

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
    doctors: z.object({
      current: z.number(),
      included: z.number(),
      overage: z.number(),
      chargeCents: z.number(),
    }),
    prescriptions: z.object({
      current: z.number(),
      included: z.number(),
      overage: z.number(),
      chargeCents: z.number(),
    }),
    invoices: z.object({
      current: z.number(),
      included: z.number(),
      overage: z.number(),
      chargeCents: z.number(),
    }),
  }),
  platformFeeCents: z.number(),
  setupFeeCents: z.number().default(0),
  dedicatedSupportCents: z.number().default(0),
  overageTotalCents: z.number(),
  projectedMonthTotalCents: z.number(),
  currency: z.string(),
});
export type EnterpriseContractEstimate = z.infer<
  typeof enterpriseContractEstimateSchema
>;

export const enterpriseContractInvoicePreviewSchema = z.object({
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  currency: z.string(),
  lines: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      quantity: z.number(),
      included: z.number(),
      overage: z.number(),
      unitCents: z.number(),
      chargeCents: z.number(),
      source: z.enum(["SYSTEM", "CUSTOM"]),
    }),
  ),
  subtotalCents: z.number(),
  taxCents: z.number(),
  totalCents: z.number(),
});
export type EnterpriseContractInvoicePreview = z.infer<
  typeof enterpriseContractInvoicePreviewSchema
>;

/**
 * `idempotencyKey` separates **issuance** from **retry**: the caller owns the
 * key, so a retried request returns the invoice already issued under it instead
 * of raising a second bill. Required, because an adjustment without a key
 * double-bills on every retry and adjustment invoices are real money.
 */
export const enterpriseAdjustmentInvoiceRequestSchema = z.object({
  label: z.string().min(1).max(120),
  amountCents: z.number().int().positive(),
  idempotencyKey: z
    .string()
    .min(8)
    .max(120)
    .regex(
      /^[A-Za-z0-9._:-]+$/,
      'idempotencyKey may contain letters, digits, dot, underscore, colon or hyphen',
    ),
});
export type EnterpriseAdjustmentInvoiceRequest = z.infer<
  typeof enterpriseAdjustmentInvoiceRequestSchema
>;

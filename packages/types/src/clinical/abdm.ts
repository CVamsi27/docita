import { z } from "zod";

/**
 * ABHA (Ayushman Bharat Health Account) address — the patient's PHR handle in
 * the ABDM ecosystem, e.g. `asha.verma@abdm` (or `@sbx` on the ABDM sandbox).
 *
 * Format per ABDM: a local part of 8–18 chars using lowercase letters, digits,
 * dot or underscore, that must start with a letter and cannot start/end with a
 * separator, followed by `@<provider-suffix>`. We validate shape only —
 * authoritative verification happens against the ABDM gateway (deferred to the
 * M1 gateway integration, which requires sandbox credentials).
 */
export const abhaAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?=.{8,18}@)[a-z][a-z0-9]*(?:[._][a-z0-9]+)*@[a-z]{2,10}$/,
    "Enter a valid ABHA address, e.g. name@abdm",
  );

/** 14-digit ABHA number, accepted with or without the conventional hyphens. */
export const abhaNumberSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/-/g, ""))
  .pipe(z.string().regex(/^\d{14}$/, "ABHA number must be 14 digits"));

export type AbhaAddress = z.infer<typeof abhaAddressSchema>;
export type AbhaNumber = z.infer<typeof abhaNumberSchema>;

export const hfrFacilityIdSchema = z
  .string()
  .trim()
  .min(3, "Enter the HFR Facility ID")
  .max(80, "HFR Facility ID is too long");

export const hprIdSchema = z
  .string()
  .trim()
  .min(3, "Enter the HPR ID")
  .max(80, "HPR ID is too long");

export type HfrFacilityId = z.infer<typeof hfrFacilityIdSchema>;
export type HprId = z.infer<typeof hprIdSchema>;

/** Request to verify a patient's ABHA against the ABDM gateway (M1). */
export const verifyAbhaRequestSchema = z
  .object({
    abhaAddress: abhaAddressSchema.optional(),
    abhaNumber: abhaNumberSchema.optional(),
  })
  .refine((v) => v.abhaAddress || v.abhaNumber, {
    message: "Provide an ABHA address or ABHA number to verify",
  });

/** Outcome of an ABDM gateway verification, persisted on the patient. */
export const abhaVerificationResultSchema = z.object({
  verified: z.boolean(),
  abhaAddress: z.string().nullable(),
  abhaNumber: z.string().nullable(),
  /** Verified KYC name returned by ABDM, for name-match confirmation. */
  kycName: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  /** Present when verification could not be performed or failed. */
  error: z.string().nullable().optional(),
});

export type VerifyAbhaRequest = z.infer<typeof verifyAbhaRequestSchema>;
export type AbhaVerificationResult = z.infer<
  typeof abhaVerificationResultSchema
>;

export const abdmReadinessStatusSchema = z.enum([
  "READY",
  "PENDING",
  "BLOCKED",
  "PLANNED",
]);

export const dhisRecordCategorySchema = z.enum(["CATEGORY_1", "CATEGORY_2"]);

export const dhisRecordBreakdownSchema = z.object({
  key: z.enum([
    "DIAGNOSTIC_REPORT",
    "DISCHARGE_SUMMARY",
    "PRESCRIPTION",
    "OP_CONSULTATION",
    "HEALTH_DOCUMENT",
    "INVOICE",
  ]),
  label: z.string(),
  category: dhisRecordCategorySchema,
  count: z.number().int().nonnegative(),
  facilityRatePaise: z.number().int().nonnegative(),
  dscRatePaise: z.number().int().nonnegative(),
});

export const dhisIncentiveEstimateSchema = z.object({
  month: z.string(),
  threshold: z.number().int().positive(),
  totalPotentialRecords: z.number().int().nonnegative(),
  recordsAboveThreshold: z.number().int().nonnegative(),
  estimatedFacilityIncentivePaise: z.number().int().nonnegative(),
  estimatedDscIncentivePaise: z.number().int().nonnegative(),
  category1Count: z.number().int().nonnegative(),
  category2Count: z.number().int().nonnegative(),
  breakdown: z.array(dhisRecordBreakdownSchema),
  ratesEffectiveLabel: z.string(),
  sourceLabel: z.string(),
});

export const abdmReadinessItemSchema = z.object({
  key: z.enum([
    "PLATFORM_CREDENTIALS",
    "TENANT_ENABLEMENT",
    "HFR_FACILITY",
    "HPR_DOCTORS",
    "ABHA_VERIFICATION",
    "CALLBACK_SECURITY",
    "PHI_LOGGING",
    "M2_CARE_CONTEXTS",
    "FHIR_VALIDATION",
    "DHIS_WASA",
  ]),
  label: z.string(),
  status: abdmReadinessStatusSchema,
  detail: z.string(),
});

export const abdmClinicDashboardSchema = z.object({
  abdmEnabled: z.boolean(),
  environmentConfigured: z.boolean(),
  hfrFacilityId: z.string().nullable(),
  hfrConfigured: z.boolean(),
  hprDoctorsConfigured: z.number().int().nonnegative(),
  doctorsRequiringHpr: z.number().int().nonnegative(),
  abhaVerifiedPatients: z.number().int().nonnegative(),
  totalPatients: z.number().int().nonnegative(),
  m1Status: abdmReadinessStatusSchema,
  m2Status: abdmReadinessStatusSchema,
  m3Status: abdmReadinessStatusSchema,
  readinessItems: z.array(abdmReadinessItemSchema),
  dhisEstimate: dhisIncentiveEstimateSchema,
});

export type AbdmReadinessStatus = z.infer<typeof abdmReadinessStatusSchema>;
export type DhisRecordCategory = z.infer<typeof dhisRecordCategorySchema>;
export type DhisRecordBreakdown = z.infer<typeof dhisRecordBreakdownSchema>;
export type DhisIncentiveEstimate = z.infer<typeof dhisIncentiveEstimateSchema>;
export type AbdmReadinessItem = z.infer<typeof abdmReadinessItemSchema>;
export type AbdmClinicDashboard = z.infer<typeof abdmClinicDashboardSchema>;

export const abdmCareContextSourceSchema = z.enum([
  "OP_CONSULTATION",
  "PRESCRIPTION",
  "DIAGNOSTIC_REPORT",
  "DISCHARGE_SUMMARY",
  "HEALTH_DOCUMENT",
  "INVOICE",
]);

export const abdmCareContextStatusSchema = z.enum([
  "READY",
  "LINK_REQUESTED",
  "LINKED",
  "SHARE_REQUESTED",
  "SHARED",
  "FAILED",
]);

export const abdmTransactionStatusSchema = z.enum([
  "PENDING",
  "ACKNOWLEDGED",
  "SUCCEEDED",
  "FAILED",
  "RETRYABLE",
]);

export const abdmTransactionDirectionSchema = z.enum([
  "INBOUND",
  "OUTBOUND",
  "INTERNAL",
]);

export const abdmTransactionTypeSchema = z.enum([
  "M1_ABHA_VERIFY",
  "M2_GENERATE_CONTEXT",
  "M2_LINK_CONTEXT",
  "M2_DISCOVER_CALLBACK",
  "M2_LINK_CALLBACK",
  "M2_DATA_REQUEST",
  "M2_DATA_PUSH",
  "M2_NOTIFY",
  "M3_CONSENT_REQUEST",
  "M3_CONSENT_CALLBACK",
  "M3_DATA_FETCH",
]);

export const abdmConsentRequestStatusSchema = z.enum([
  "DRAFT",
  "REQUESTED",
  "GRANTED",
  "DENIED",
  "EXPIRED",
  "REVOKED",
  "FAILED",
]);

export const abdmCareContextSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  sourceType: abdmCareContextSourceSchema,
  sourceId: z.string(),
  referenceNumber: z.string(),
  display: z.string(),
  hiType: z.string(),
  status: abdmCareContextStatusSchema,
  linkedAt: z.string().nullable(),
  lastSharedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const abdmTransactionSchema = z.object({
  id: z.string(),
  patientId: z.string().nullable(),
  careContextId: z.string().nullable(),
  type: abdmTransactionTypeSchema,
  direction: abdmTransactionDirectionSchema,
  status: abdmTransactionStatusSchema,
  requestId: z.string().nullable(),
  transactionId: z.string().nullable(),
  correlationId: z.string().nullable(),
  error: z.string().nullable(),
  retryCount: z.number().int().nonnegative(),
  nextRetryAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const abdmConsentRequestSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  abhaAddress: z.string(),
  purposeCode: z.string(),
  purposeText: z.string(),
  status: abdmConsentRequestStatusSchema,
  requestId: z.string().nullable(),
  consentId: z.string().nullable(),
  artefactId: z.string().nullable(),
  requestedAt: z.string().nullable(),
  grantedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const abdmExternalRecordSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  consentRequestId: z.string().nullable(),
  sourceHipId: z.string().nullable(),
  careContextReference: z.string().nullable(),
  hiType: z.string(),
  receivedAt: z.string(),
});

export const abdmOpsInboxSchema = z.object({
  retryableTransactions: z.array(abdmTransactionSchema),
  failedTransactions: z.array(abdmTransactionSchema),
  pendingConsents: z.array(abdmConsentRequestSchema),
  recentExternalRecords: z.array(abdmExternalRecordSchema),
});

export const createAbdmCareContextRequestSchema = z.object({
  patientId: z.string().min(1),
  sourceType: abdmCareContextSourceSchema,
  sourceId: z.string().min(1),
});

export const createAbdmConsentRequestSchema = z.object({
  patientId: z.string().min(1),
  abhaAddress: abhaAddressSchema,
  purposeCode: z.string().trim().min(2).max(24).default("CAREMGT"),
  purposeText: z.string().trim().min(3).max(120).default("Care Management"),
});

export const abdmGatewayCallbackSchema = z.object({
  requestId: z.string().optional(),
  transactionId: z.string().optional(),
  patientId: z.string().optional(),
  abhaAddress: z.string().optional(),
  careContextReference: z.string().optional(),
  dataPushUrl: z.string().url().optional(),
  hiType: z.string().optional(),
  sourceHipId: z.string().optional(),
  status: z.string().optional(),
  payload: z.unknown().optional(),
});

export type AbdmCareContextSource = z.infer<typeof abdmCareContextSourceSchema>;
export type AbdmCareContextStatus = z.infer<typeof abdmCareContextStatusSchema>;
export type AbdmTransactionStatus = z.infer<typeof abdmTransactionStatusSchema>;
export type AbdmTransactionDirection = z.infer<
  typeof abdmTransactionDirectionSchema
>;
export type AbdmTransactionType = z.infer<typeof abdmTransactionTypeSchema>;
export type AbdmConsentRequestStatus = z.infer<
  typeof abdmConsentRequestStatusSchema
>;
export type AbdmCareContext = z.infer<typeof abdmCareContextSchema>;
export type AbdmTransaction = z.infer<typeof abdmTransactionSchema>;
export type AbdmConsentRequest = z.infer<typeof abdmConsentRequestSchema>;
export type AbdmExternalRecord = z.infer<typeof abdmExternalRecordSchema>;
export type AbdmOpsInbox = z.infer<typeof abdmOpsInboxSchema>;
export type CreateAbdmCareContextRequest = z.infer<
  typeof createAbdmCareContextRequestSchema
>;
export type CreateAbdmConsentRequest = z.infer<
  typeof createAbdmConsentRequestSchema
>;
export type AbdmGatewayCallback = z.infer<typeof abdmGatewayCallbackSchema>;

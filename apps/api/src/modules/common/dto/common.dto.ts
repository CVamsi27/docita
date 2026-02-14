import { z } from 'zod';

/**
 * Razorpay Webhook DTO
 * Validation for: POST /webhooks/razorpay
 * 
 * BEFORE: Just `@Body() payload: any`
 * AFTER:  @Body() payload: RazorpayWebhookDto with @UsePipes(ZodValidationPipe)
 */
export const RazorpayWebhookSchema = z.object({
  id: z.string().min(1, 'Event ID required'),
  event: z.enum([
    'payment.authorized',
    'payment.failed',
    'payment.captured',
    'refund.created',
    'subscription.charged',
  ]),
  created_at: z.number().int(),
  payload: z.object({
    payment: z.object({
      id: z.string(),
      entity: z.literal('payment'),
      amount: z.number().int().positive(),
      currency: z.string(),
      status: z.enum(['authorized', 'captured', 'failed']),
      method: z.string(),
      description: z.string().optional(),
      notes: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
});

export type RazorpayWebhookDto = z.infer<typeof RazorpayWebhookSchema>;

/**
 * Refresh Token DTO
 * Validation for: POST /auth/refresh
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

/**
 * Create Checkout DTO
 * Validation for: POST /subscriptions/checkout
 */
export const CreateCheckoutSchema = z.object({
  planId: z.string().min(1, 'Plan ID required'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  clinicId: z.string().min(1, 'Clinic ID required'),
  quantity: z.number().int().min(1).default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateCheckoutDto = z.infer<typeof CreateCheckoutSchema>;

/**
 * Emergency Access DTO
 * Validation for: POST /consent/emergency-access
 */
export const EmergencyAccessSchema = z.object({
  patientId: z.string().min(1, 'Patient ID required'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),
  duration: z.enum(['1_HOUR', '4_HOURS', '8_HOURS', '24_HOURS']),
  requestedBy: z.string().min(1, 'Requester ID required'),
});

export type EmergencyAccessDto = z.infer<typeof EmergencyAccessSchema>;

/**
 * Bulk Import Data DTO
 * Validation for: POST /imports/bulk
 */
export const BulkImportDataSchema = z.object({
  dataType: z.enum(['PATIENTS', 'APPOINTMENTS', 'PRESCRIPTIONS']),
  file: z.object({
    fieldname: z.string(),
    originalname: z.string().regex(/\.(csv|xlsx|json)$/, 'Invalid file format'),
    encoding: z.string(),
    mimetype: z.string(),
    buffer: z.instanceof(Buffer),
    size: z.number().max(10485760, 'File size must be less than 10MB'),
  }),
  clinicId: z.string().min(1, 'Clinic ID required'),
  validateOnly: z.boolean().default(false),
});

export type BulkImportDataDto = z.infer<typeof BulkImportDataSchema>;

/**
 * Bulk Import Result DTO
 * Used in responses for import operations
 */
export const ImportResultSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  totalRecords: z.number().int(),
  successCount: z.number().int(),
  failureCount: z.number().int(),
  errors: z
    .array(
      z.object({
        rowNumber: z.number(),
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export type ImportResultDto = z.infer<typeof ImportResultSchema>;

/**
 * CREATE THESE ADDITIONAL DTOs (similar pattern):
 * 
 * - CreateAppointmentDto
 * - CreateConsultationDto
 * - CreatePrescriptionDto
 * - CreateInvoiceDto
 * - UpdateClinicSettingsDto
 * - BulkDeleteDto
 * - ExportDataDto
 * - ScheduleBulknotificationDto
 * - CreateAuditLogDto
 * - WebhookConfigDto
 * - And 10+ more as identified in checklist
 * 
 * Pattern is same for all:
 * 1. Define Zod schema
 * 2. Export type using z.infer
 * 3. Use in controller with @UsePipes(ZodValidationPipe)
 */

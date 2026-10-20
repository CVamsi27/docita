import { z } from 'zod';
import { ErrorSeverity } from '@workspace/db';

const optionalNullableId = z
  .string()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);

export const ApiRequestSchema = z.object({
  clinicId: optionalNullableId,
  userId: optionalNullableId,
  method: z.string().min(1),
  path: z.string().min(1),
  statusCode: z.number().int(),
  duration: z.number().min(0),
  requestSize: z.number().int().optional(),
  responseSize: z.number().int().optional(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  error: z.string().optional(),
  errorStack: z.string().optional(),
  /**
   * Opaque join key shared with the ErrorLog row for the same request. Optional
   * because non-HTTP producers of telemetry have no request to correlate.
   */
  correlationId: z.string().min(8).max(64).optional(),
  /**
   * When the request finished. Omitted by producers that cannot tell; the
   * service then stamps the flush instant, which is the same imprecision the
   * pre-O02 pipeline always had.
   */
  observedAt: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ErrorLogSchema = z.object({
  clinicId: optionalNullableId,
  userId: optionalNullableId,
  type: z.string().min(1),
  message: z.string().min(1),
  stack: z.string().optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().optional(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  requestBody: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  /** Matches ApiRequest.correlationId for the same request, when one exists. */
  correlationId: z.string().min(8).max(64).optional(),
  severity: z.nativeEnum(ErrorSeverity).default(ErrorSeverity.ERROR),
});

export type ApiRequestInput = z.input<typeof ApiRequestSchema>;
export type ErrorLogInput = z.input<typeof ErrorLogSchema>;

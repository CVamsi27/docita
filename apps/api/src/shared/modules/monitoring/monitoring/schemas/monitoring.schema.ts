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
  severity: z.nativeEnum(ErrorSeverity).default(ErrorSeverity.ERROR),
});

export type ApiRequestInput = z.input<typeof ApiRequestSchema>;
export type ErrorLogInput = z.input<typeof ErrorLogSchema>;

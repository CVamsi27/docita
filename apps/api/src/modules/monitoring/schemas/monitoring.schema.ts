import { z } from 'zod';
import { ErrorSeverity } from '@workspace/db';

export const ApiRequestSchema = z.object({
  clinicId: z.string().optional(),
  userId: z.string().optional(),
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
  clinicId: z.string().optional(),
  userId: z.string().optional(),
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

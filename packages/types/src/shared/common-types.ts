

import { z } from "zod";
import type { JsonValue } from "./common";
import type { loginResponseSchema } from "../contracts/auth";
import type { appointmentResponseSchema } from "../contracts/appointments";
import type { patientResponseSchema } from "../contracts/patients";
import type { userSchema } from "./users";
import type { clinicSchema } from "./clinics";

export const UuidSchema = z.string().uuid("Invalid UUID format");
export const TimestampSchema = z.coerce.date();

export const BaseEntitySchema = z.object({
  id: UuidSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  });

export type JsonPrimitive = string | number | boolean | null;
export interface JsonObject {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | JsonObject
    | Array<string | number | boolean | null>;
}
export type JsonArray = Array<string | number | boolean | null | JsonObject>;

export type LogMessage = string | JsonObject;

export interface CacheManager {
  get<T = JsonValue>(key: string): Promise<T | undefined>;
  set(key: string, value: JsonValue, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
}

export interface QueueJob<T = JsonValue> {
  id: string | number;
  data: T;
  opts?: QueueJobOptions;
}

export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: number | { type: string; delay: number };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface MockQueue<T = JsonValue> {
  add(data: T, opts?: QueueJobOptions): Promise<QueueJob<T>>;
  add(name: string, data: T, opts?: QueueJobOptions): Promise<QueueJob<T>>;
  process(callback: (job: QueueJob<T>) => Promise<void> | void): Promise<void>;
  process(
    name: string,
    callback: (job: QueueJob<T>) => Promise<void> | void,
  ): Promise<void>;
  on(event: string, callback: (...args: JsonValue[]) => void): void;
}

/**
 * @deprecated Use `LoginResponse` from `../contracts/auth` (z.infer<typeof loginResponseSchema>).
 * Alias retained for backward compatibility.
 */
export type AuthResponse = z.infer<typeof loginResponseSchema>;

/**
 * @deprecated Use `User` from `../shared/users` (z.infer<typeof userSchema>).
 * Alias retained for backward compatibility.
 */
export type UserResponse = z.infer<typeof userSchema>;

/**
 * @deprecated Use `Clinic` from `../shared/clinics` (z.infer<typeof clinicSchema>).
 * Alias retained for backward compatibility.
 */
export type ClinicResponse = z.infer<typeof clinicSchema>;

/**
 * @deprecated Use `z.infer<typeof patientResponseSchema>` from `../contracts/patients`.
 * Alias retained for backward compatibility.
 */
export type PatientResponse = z.infer<typeof patientResponseSchema>;

/**
 * @deprecated Use `z.infer<typeof appointmentResponseSchema>` from `../contracts/appointments`.
 * Alias retained for backward compatibility.
 */
export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;

export interface AnalyticsSnapshot {
  timestamp: string | Date;
  patientsCount: number;
  appointmentsCount: number;
  revenue: number;
}

export interface SnapshotTrends {
  period: string;
  data: AnalyticsSnapshot[];
  summary: {
    total: number;
    average: number;
    trend: "up" | "down" | "stable";
  };
}

export interface TestUser extends UserResponse {
  password?: string;
  accessToken?: string;
}

export interface TestClinic extends ClinicResponse {
  ownerId?: string;
}

export interface TestAppointment extends AppointmentResponse {
  patientName?: string;
  doctorName?: string;
}

export interface AxeViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary?: string;
  }>;
}

export interface AxeResults {
  violations: AxeViolation[];
  passes: Array<{ id: string; description: string }>;
  incomplete: Array<{ id: string; description: string }>;
}

export interface WhatsAppPayload {
  to: string;
  type: string;
  template?: {
    name: string;
    language: { code: string };
    components?: WhatsAppComponent[];
  };
  text?: { body: string };
}

export interface WhatsAppComponent {
  type: string;
  parameters?: Array<{
    type: string;
    text?: string;
    [key: string]: string | undefined;
  }>;
  buttons?: Array<{
    type: string;
    text: string;
    [key: string]: string | undefined;
  }>;
}

export interface RequestWithUser {
  user?: UserResponse;
  clinicId?: string;
  url: string;
  method: string;
  params?: JsonObject;
  query?: JsonObject;
  body?: JsonValue;
  headers: Record<string, string | string[]>;
}

export interface ResponseContext {
  statusCode: number;
  headers: Record<string, string | string[]>;
  getResponse(): JsonValue;
  status(code: number): this;
  json(body: JsonValue): this;
  send(body: string | Buffer): this;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  data?: JsonObject;
}

export interface ClinicalAlert {
  type: "allergy" | "interaction" | "contraindication" | "warning";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details?: string;
  actionRequired?: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { old: JsonValue; new: JsonValue }>;
  metadata?: JsonObject;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date | string;
}

export interface DomainEventPayload {
  eventType: string;
  entityId: string;
  entityType: string;
  data: JsonObject;
  metadata?: JsonObject;
  timestamp: Date | string;
}

export interface PrismaModel {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: JsonValue | Date | undefined;
}

export interface HistoryItem {
  id?: string;
  patientId?: string;
  date?: Date | string;
  description: string;
  notes?: string;
  [key: string]: JsonValue | Date | undefined;
}

export interface OpenAPIParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  schema?: OpenAPISchema;
  description?: string;
}

export interface OpenAPISchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  enum?: string[];
  [key: string]: JsonValue | OpenAPISchema | undefined;
}

export interface OpenAPIDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<
    string,
    Record<
      string,
      {
        summary?: string;
        parameters?: OpenAPIParameter[];
        requestBody?: JsonObject;
        responses?: JsonObject;
      }
    >
  >;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: JsonObject;
  };
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Without<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

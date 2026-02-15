// Common types to replace 'any' and 'unknown' throughout the codebase
// Note: JsonValue is already defined in common.ts
import type { JsonValue } from './common';

// ============================================================================
// Generic Types
// ============================================================================

export type JsonPrimitive = string | number | boolean | null;
export interface JsonObject {
  [key: string]: string | number | boolean | null | JsonObject | Array<string | number | boolean | null>;
}
export type JsonArray = Array<string | number | boolean | null | JsonObject>;

export type LogMessage = string | JsonObject;

// ============================================================================
// Cache & Queue Types
// ============================================================================

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
  process(name: string, callback: (job: QueueJob<T>) => Promise<void> | void): Promise<void>;
  on(event: string, callback: (...args: JsonValue[]) => void): void;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AuthResponse {
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  user: UserResponse;
  clinic?: ClinicResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  clinicId?: string;
  active?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ClinicResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  tier: string;
  type?: string;
  settings?: JsonObject;
  subscriptionStatus?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PatientResponse {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phoneNumber: string;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  address?: string | null;
  active: boolean;
  mrn?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AppointmentResponse {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string | Date;
  duration: number;
  status: string;
  type?: string;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  patient?: PatientResponse;
  doctor?: UserResponse;
}

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
    trend: 'up' | 'down' | 'stable';
  };
}

// ============================================================================
// Test & Mock Types
// ============================================================================

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
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
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

// ============================================================================
// WhatsApp & Notification Types
// ============================================================================

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
  parameters?: Array<{ type: string; text?: string; [key: string]: string | undefined }>;
  buttons?: Array<{ type: string; text: string; [key: string]: string | undefined }>;
}

// ============================================================================
// Payment & Razorpay Types (Removed - use types from payments.ts)
// ============================================================================

// ============================================================================
// Interceptor & Request Types
// ============================================================================

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

// ============================================================================
// Validation & Settings Types (Removed duplicates - defined in other files)
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  data?: JsonObject;
}

// ============================================================================
// Medication & Clinical Types (Removed DrugInteraction - use from ai-components.ts)
// ============================================================================

export interface ClinicalAlert {
  type: 'allergy' | 'interaction' | 'contraindication' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  actionRequired?: boolean;
}

// ============================================================================
// Audit & Logging Types
// ============================================================================

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

// ============================================================================
// Database & Repository Types
// ============================================================================

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

// ============================================================================
// External API & OpenAPI Types
// ============================================================================

export interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
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
  paths: Record<string, Record<string, {
    summary?: string;
    parameters?: OpenAPIParameter[];
    requestBody?: JsonObject;
    responses?: JsonObject;
  }>>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: JsonObject;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Without<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

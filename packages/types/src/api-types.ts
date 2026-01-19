// API Types for comprehensive type safety

// ============================================================================
// FHIR Extended Types - For accessing optional Prisma fields
// ============================================================================

export interface FHIRExtendedPatient {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Extended FHIR fields (may not exist in base schema)
  mrn?: string;
  race?: string;
  ethnicity?: string;
  preferredLanguage?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export interface FHIRExtendedVitalSign {
  id: string;
  appointmentId: string;
  clinicId: string;
  patientId: string;
  createdAt: Date;
  temperature?: number | null;
  pulse?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weight?: number | null;
  height?: number | null;
  // Extended fields
  systolicBP?: number;
  diastolicBP?: number;
  bloodPressure?: string | null;
}

export interface FHIRExtendedMedication {
  id: string;
  prescriptionId: string;
  medicineId: string | null;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity: number;
  route?: string | null;
  // Extended fields
  ndcCode?: string;
  rxNormCui?: string;
  refillsAllowed?: number;
}

// ============================================================================
// AI Service Types
// ============================================================================

export interface AIRawResponse {
  drugInteractions?: unknown[];
  contraindications?: unknown[];
  alerts?: unknown[];
  suggestions?: unknown[];
  recommendations?: unknown[];
  [key: string]: unknown;
}

export interface OpenAIMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface NormalizedAIData {
  symptoms?: string[];
  medicalHistory?: string[];
  allergies?: string[];
  medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
  followUpRecommendations?: string[];
  conditions?: Array<{ description: string; severity?: string }>;
  [key: string]: unknown;
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionWithRelations {
  id: string;
  clinicId: string;
  plan: string;
  status: string;
  billingCycle: string;
  basePriceCents: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  scheduledChange?: ScheduledChangeData | null;
  clinic?: {
    id: string;
    name: string;
    email: string;
    tier: string;
  };
}

export interface ScheduledChangeData {
  effectiveAt: string | Date;
  newPlan?: string;
  newBillingCycle?: string;
  action?: 'upgrade' | 'downgrade' | 'cancel';
}

// ============================================================================
// Controller Types
// ============================================================================

export interface WebhookPayload {
  event: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface GenericRequestBody {
  [key: string]: unknown;
}

// ============================================================================
// Decorator & Guard Types
// ============================================================================

export type DecoratorTarget = new (...args: unknown[]) => unknown;

export type MethodDecorator = (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor | void;

// ============================================================================
// Invoice Types
// ============================================================================

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type?: string;
}

// ============================================================================
// Log Entry Types
// ============================================================================

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  module: string;
  message: string;
  details?: string;
}

// ============================================================================
// WhatsApp Types
// ============================================================================

export interface WhatsAppAutomationConfig {
  enabled?: boolean;
  requireConsentBeforeSending?: boolean;
  appointmentReminders?: boolean;
  paymentReminders?: boolean;
  prescriptionNotifications?: boolean;
}



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

  ndcCode?: string;
  rxNormCui?: string;
  refillsAllowed?: number;
}

export interface AIRawResponse {
  drugInteractions?: Array<Record<string, unknown>>;
  contraindications?: Array<Record<string, unknown>>;
  alerts?: Array<Record<string, unknown>>;
  suggestions?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface OpenAIMessageContent {
  type: "text" | "image_url";
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
  action?: "upgrade" | "downgrade" | "cancel";
}

export interface WebhookPayload {
  event: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface GenericRequestBody {
  [key: string]: unknown;
}

export type DecoratorTarget = new (...args: unknown[]) => unknown;

export type MethodDecorator = (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor | void;

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type?: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG";
  module: string;
  message: string;
  details?: string;
}

export interface WhatsAppAutomationConfig {
  enabled?: boolean;
  requireConsentBeforeSending?: boolean;
  appointmentReminders?: boolean;
  paymentReminders?: boolean;
  prescriptionNotifications?: boolean;
}

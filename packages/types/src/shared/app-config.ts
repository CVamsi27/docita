/**
 * App-level configuration types shared between the frontend app and
 * any server that serialises configuration over the wire.
 *
 * These are plain TypeScript interfaces (no Zod) because they represent
 * UI-facing option lists whose shape is already validated at the API layer.
 */

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  short?: string;
}

export interface DurationOption {
  value: number;
  label: string;
}

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

export interface PatientImportField {
  field: string;
  label: string;
  required: boolean;
  type: string;
  options?: SelectOption[];
}

export interface FormOptions {
  gender: SelectOption[];
  bloodGroup: SelectOption[];
  appointmentType: SelectOption[];
  appointmentStatus: SelectOption[];
  invoiceStatus: SelectOption[];
  paymentStatus: SelectOption[];
  userRole: SelectOption[];
  weekday: SelectOption[];
  customFieldType: SelectOption[];
  templateFieldType: SelectOption[];
  specialty: SelectOption[];
  documentType: SelectOption[];
  appointmentDuration: DurationOption[];
  whatsappMessageType: SelectOption[];
  currency: CurrencyOption[];
  timezone: SelectOption[];
}

export interface DefaultValues {
  appointmentDuration: number;
  consultationFee: number;
  currency: string;
  timezone: string;
  invoiceItems: Array<{ description: string; quantity: number; price: number }>;
}

export interface ClinicSettings {
  consultationFee: number;
  currency: string;
  timezone: string;
  appointmentDuration: number;
  appointmentType?: string;
  clinicType?: string;
  facilityLabel?: "CLINIC" | "HOSPITAL";
  sidebarNavOrder?: unknown;
}

export interface AppConfig {
  formOptions: FormOptions;
  patientImportFields: PatientImportField[];
  defaults: DefaultValues;
  clinicSettings?: ClinicSettings;
}

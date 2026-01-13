// Types for config options
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

export interface PatientImportField {
  field: string;
  label: string;
  required: boolean;
  type: string;
  options?: SelectOption[];
}

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
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
  appointmentType?: string; // Added optional property based on usage inferred
}

export interface AppConfig {
  formOptions: FormOptions;
  patientImportFields: PatientImportField[];
  defaults: DefaultValues;
  clinicSettings?: ClinicSettings;
}

// Default fallback values (should match backend)
export const DEFAULT_FORM_OPTIONS: FormOptions = {
  gender: [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
  ],
  bloodGroup: [
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
  ],
  appointmentType: [
    { value: "consultation", label: "Consultation" },
    { value: "follow-up", label: "Follow-up" },
    { value: "check-up", label: "Check-up" },
  ],
  appointmentStatus: [
    { value: "scheduled", label: "Scheduled", color: "purple" },
    { value: "confirmed", label: "Confirmed", color: "blue" },
    { value: "completed", label: "Completed", color: "green" },
    { value: "cancelled", label: "Cancelled", color: "red" },
  ],
  invoiceStatus: [
    { value: "pending", label: "Pending", color: "yellow" },
    { value: "paid", label: "Paid", color: "green" },
    { value: "overdue", label: "Overdue", color: "red" },
    { value: "cancelled", label: "Cancelled", color: "gray" },
  ],
  paymentStatus: [
    { value: "pending", label: "Pending", color: "yellow" },
    { value: "paid", label: "Paid", color: "green" },
    { value: "failed", label: "Failed", color: "red" },
  ],
  userRole: [
    { value: "DOCTOR", label: "Doctor" },
    { value: "RECEPTIONIST", label: "Receptionist" },
    { value: "ADMIN", label: "Admin" },
  ],
  weekday: [
    { value: "monday", label: "Monday", short: "Mon" },
    { value: "tuesday", label: "Tuesday", short: "Tue" },
    { value: "wednesday", label: "Wednesday", short: "Wed" },
    { value: "thursday", label: "Thursday", short: "Thu" },
    { value: "friday", label: "Friday", short: "Fri" },
    { value: "saturday", label: "Saturday", short: "Sat" },
    { value: "sunday", label: "Sunday", short: "Sun" },
  ],
  customFieldType: [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "select", label: "Select" },
    { value: "date", label: "Date" },
    { value: "checkbox", label: "Checkbox" },
  ],
  templateFieldType: [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "select", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
  ],
  specialty: [
    { value: "General", label: "General Practice" },
    { value: "Dental", label: "Dental" },
    { value: "Cardiology", label: "Cardiology" },
    { value: "Pediatrics", label: "Pediatrics" },
    { value: "Ophthalmology", label: "Ophthalmology" },
  ],
  documentType: [
    { value: "prescription", label: "Prescription" },
    { value: "lab_report", label: "Lab Report" },
    { value: "other", label: "Other" },
  ],
  appointmentDuration: [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
  ],
  whatsappMessageType: [
    { value: "reminder", label: "Appointment Reminder" },
    { value: "receipt", label: "Payment Receipt" },
    { value: "payment-link", label: "Payment Link" },
  ],
  currency: [
    { value: "INR", label: "Indian Rupee", symbol: "₹" },
    { value: "USD", label: "US Dollar", symbol: "$" },
  ],
  timezone: [{ value: "Asia/Kolkata", label: "India Standard Time (IST)" }],
};

export const DEFAULT_VALUES: DefaultValues = {
  appointmentDuration: 30,
  consultationFee: 800,
  currency: "INR",
  timezone: "Asia/Kolkata",
  invoiceItems: [{ description: "Consultation Fee", quantity: 1, price: 800 }],
};

export const DEFAULT_CONFIG: AppConfig = {
  formOptions: DEFAULT_FORM_OPTIONS,
  patientImportFields: [],
  defaults: DEFAULT_VALUES,
};

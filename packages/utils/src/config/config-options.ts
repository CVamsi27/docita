import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from "../date/index.js";

export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

export const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
] as const;

export const APPOINTMENT_TYPE_OPTIONS = [
  { value: "consultation", label: "Consultation" },
  { value: "follow-up", label: "Follow-up" },
  { value: "check-up", label: "Check-up" },
  { value: "emergency", label: "Emergency" },
  { value: "procedure", label: "Procedure" },
] as const;

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled", color: "purple" },
  { value: "confirmed", label: "Confirmed", color: "blue" },
  { value: "checked-in", label: "Checked In", color: "teal" },
  { value: "in-progress", label: "In Progress", color: "yellow" },
  { value: "completed", label: "Completed", color: "green" },
  { value: "cancelled", label: "Cancelled", color: "red" },
  { value: "no-show", label: "No Show", color: "gray" },
] as const;

export const APPOINTMENT_DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
] as const;

export const INVOICE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "paid", label: "Paid", color: "green" },
  { value: "overdue", label: "Overdue", color: "red" },
  { value: "cancelled", label: "Cancelled", color: "gray" },
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  { value: "created", label: "Created", color: "blue" },
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "paid", label: "Paid", color: "green" },
  { value: "failed", label: "Failed", color: "red" },
  { value: "expired", label: "Expired", color: "gray" },
  { value: "cancelled", label: "Cancelled", color: "gray" },
] as const;

export const USER_ROLE_OPTIONS = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ADMIN", label: "Admin" },
  { value: "ADMIN_DOCTOR", label: "Admin Doctor" },
  { value: "INTERNAL", label: "Internal" },
] as const;

export const WEEKDAY_OPTIONS = [
  { value: "monday", label: "Monday", short: "Mon" },
  { value: "tuesday", label: "Tuesday", short: "Tue" },
  { value: "wednesday", label: "Wednesday", short: "Wed" },
  { value: "thursday", label: "Thursday", short: "Thu" },
  { value: "friday", label: "Friday", short: "Fri" },
  { value: "saturday", label: "Saturday", short: "Sat" },
  { value: "sunday", label: "Sunday", short: "Sun" },
] as const;

export const CUSTOM_FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select (Dropdown)" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Text Area" },
] as const;

export const TEMPLATE_FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
] as const;

export const SPECIALTY_OPTIONS = [
  { value: "General", label: "General Practice" },
  { value: "Dental", label: "Dental" },
  { value: "Cardiology", label: "Cardiology" },
  { value: "Pediatrics", label: "Pediatrics" },
  { value: "Ophthalmology", label: "Ophthalmology" },
  { value: "Dermatology", label: "Dermatology" },
  { value: "Orthopedics", label: "Orthopedics" },
  { value: "Neurology", label: "Neurology" },
  { value: "Gynecology", label: "Gynecology" },
  { value: "ENT", label: "ENT (Ear, Nose, Throat)" },
  { value: "Psychiatry", label: "Psychiatry" },
  { value: "Urology", label: "Urology" },
  { value: "Pulmonology", label: "Pulmonology" },
  { value: "Gastroenterology", label: "Gastroenterology" },
  { value: "Other", label: "Other" },
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "prescription", label: "Prescription" },
  { value: "lab_report", label: "Lab Report" },
  { value: "scan", label: "Scan/X-Ray" },
  { value: "consent_form", label: "Consent Form" },
  { value: "insurance", label: "Insurance Document" },
  { value: "id_proof", label: "ID Proof" },
  { value: "other", label: "Other" },
] as const;

export const FACILITY_TYPE_OPTIONS = [
  { value: "CLINIC", label: "Clinic (Outpatient Only)" },
  { value: "HOSPITAL", label: "Hospital (In-patient/Multi-dept)" },
] as const;

export const WHATSAPP_MESSAGE_TYPE_OPTIONS = [
  { value: "reminder", label: "Appointment Reminder" },
  { value: "receipt", label: "Payment Receipt" },
  { value: "payment-link", label: "Payment Link" },
  { value: "general", label: "General Message" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { value: "AED", label: "UAE Dirham", symbol: "AED" },
  { value: "ZAR", label: "South African Rand", symbol: "R" },
] as const;

export const DEFAULT_APPOINTMENT_DURATION = 30;
export const DEFAULT_CONSULTATION_FEE = 800;
export const DEFAULT_CURRENCY = "INR";

export const DEFAULT_INVOICE_ITEMS = [
  { description: "Consultation Fee", quantity: 1, price: 800 },
] as const;

export const FOLLOW_UP_TYPES = [
  { value: "follow_up", label: "Follow-up Visit" },
  { value: "checkup", label: "Routine Checkup" },
  { value: "lab_review", label: "Lab Results Review" },
  { value: "medication_review", label: "Medication Review" },
  { value: "procedure", label: "Procedure" },
] as const;

export const REMINDER_DAYS_OPTIONS = [
  { value: 1, label: "1 day before" },
  { value: 2, label: "2 days before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
] as const;

export const INVENTORY_CATEGORY_OPTIONS = [
  { value: "medicine", label: "Medicine" },
  { value: "medical-supply", label: "Medical Supply" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
] as const;

export const QUEUE_STATUS_OPTIONS = [
  { value: "waiting", label: "Waiting" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "no-show", label: "No Show" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const WARD_TYPE_OPTIONS = [
  { value: "general", label: "General Ward" },
  { value: "icu", label: "ICU" },
  { value: "private", label: "Private Room" },
  { value: "emergency", label: "Emergency" },
] as const;

export const BED_NUMBER_OPTIONS = [
  { value: "101", label: "Bed 101" },
  { value: "102", label: "Bed 102" },
  { value: "103", label: "Bed 103" },
  { value: "201", label: "Bed 201" },
  { value: "202", label: "Bed 202" },
] as const;

export function getFormOptions() {
  return {
    gender: GENDER_OPTIONS,
    bloodGroup: BLOOD_GROUP_OPTIONS,
    appointmentType: APPOINTMENT_TYPE_OPTIONS,
    appointmentStatus: APPOINTMENT_STATUS_OPTIONS,
    invoiceStatus: INVOICE_STATUS_OPTIONS,
    paymentStatus: PAYMENT_STATUS_OPTIONS,
    userRole: USER_ROLE_OPTIONS,
    weekday: WEEKDAY_OPTIONS,
    customFieldType: CUSTOM_FIELD_TYPE_OPTIONS,
    templateFieldType: TEMPLATE_FIELD_TYPE_OPTIONS,
    specialty: SPECIALTY_OPTIONS,
    documentType: DOCUMENT_TYPE_OPTIONS,
    appointmentDuration: APPOINTMENT_DURATION_OPTIONS,
    whatsappMessageType: WHATSAPP_MESSAGE_TYPE_OPTIONS,
    currency: CURRENCY_OPTIONS,
    timezone: TIMEZONE_OPTIONS,
  };
}

export function getDefaults() {
  return {
    appointmentDuration: DEFAULT_APPOINTMENT_DURATION,
    consultationFee: DEFAULT_CONSULTATION_FEE,
    currency: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
    invoiceItems: DEFAULT_INVOICE_ITEMS,
  };
}

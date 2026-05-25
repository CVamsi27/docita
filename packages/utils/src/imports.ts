import { BLOOD_GROUP_OPTIONS, GENDER_OPTIONS } from "./config/index.js";

export const PATIENT_FIELD_MAPPINGS = {
  firstName: [
    "first name",
    "firstname",
    "first_name",
    "name",
    "patient name",
    "patientname",
  ],
  lastName: ["last name", "lastname", "last_name", "surname", "family name"],
  phoneNumber: [
    "phone",
    "phone number",
    "phonenumber",
    "mobile",
    "contact",
    "mobile number",
  ],
  email: ["email", "email address", "emailaddress", "mail"],
  dateOfBirth: [
    "dob",
    "date of birth",
    "dateofbirth",
    "birth date",
    "birthdate",
    "birthday",
  ],
  gender: ["gender", "sex"],
  bloodGroup: ["blood group", "bloodgroup", "blood type", "bloodtype"],
  address: ["address", "location", "residence", "street address"],
  allergies: ["allergies", "allergy", "known allergies"],
  medicalHistory: [
    "medical history",
    "medicalhistory",
    "history",
    "conditions",
  ],
  invoiceTotal: [
    "invoice total",
    "invoicetotal",
    "bill total",
    "grand total",
    "total amount",
  ],
  invoiceLineItems: [
    "invoice line items",
    "invoicelineitems",
    "bill items",
    "line items",
    "services",
  ],
} as const;

export type PatientFieldKey = keyof typeof PATIENT_FIELD_MAPPINGS;

export interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
  sampleValues: string[];
}

export interface ImportPreview {
  columns: ColumnMapping[];
  suggestedMappings: Record<string, string>;
  totalRows: number;
  sampleData: Array<Record<string, unknown>>;
}

export interface DuplicateDetail {
  row: number;
  reason: string;
  existingPatient?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
  errors: string[];
  duplicateDetails: DuplicateDetail[];
}

export interface ImportFieldDefinition {
  field: string;
  label: string;
  required: boolean;
  type: "text" | "phone" | "email" | "date" | "select" | "textarea";
  options?: Array<{ value: string; label: string }>;
}

export const PATIENT_IMPORT_FIELDS: ImportFieldDefinition[] = [
  { field: "firstName", label: "First Name", required: true, type: "text" },
  { field: "lastName", label: "Last Name", required: false, type: "text" },
  {
    field: "phoneNumber",
    label: "Phone Number",
    required: true,
    type: "phone",
  },
  { field: "email", label: "Email", required: false, type: "email" },
  {
    field: "dateOfBirth",
    label: "Date of Birth",
    required: false,
    type: "date",
  },
  {
    field: "gender",
    label: "Gender",
    required: false,
    type: "select",
    options: [...GENDER_OPTIONS],
  },
  {
    field: "bloodGroup",
    label: "Blood Group",
    required: false,
    type: "select",
    options: [...BLOOD_GROUP_OPTIONS],
  },
  { field: "address", label: "Address", required: false, type: "textarea" },
  { field: "allergies", label: "Allergies", required: false, type: "text" },
  {
    field: "medicalHistory",
    label: "Medical History",
    required: false,
    type: "textarea",
  },
];

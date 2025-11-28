import { z } from "zod";
import { GENDER_OPTIONS, BLOOD_GROUP_OPTIONS } from "./config.js";

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
} as const;

export type PatientFieldKey = keyof typeof PATIENT_FIELD_MAPPINGS;

export const columnMappingSchema = z.object({
  excelColumn: z.string(),
  dbField: z.string().nullable(),
  sampleValues: z.array(z.string()),
});
export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const importPreviewSchema = z.object({
  columns: z.array(columnMappingSchema),
  suggestedMappings: z.record(z.string(), z.string()),
  totalRows: z.number(),
  sampleData: z.array(z.record(z.string(), z.unknown())),
});
export type ImportPreview = z.infer<typeof importPreviewSchema>;

export const duplicateDetailSchema = z.object({
  row: z.number(),
  reason: z.string(),
  existingPatient: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
    .optional(),
});
export type DuplicateDetail = z.infer<typeof duplicateDetailSchema>;

export const importResultSchema = z.object({
  total: z.number(),
  success: z.number(),
  failed: z.number(),
  duplicates: z.number(),
  errors: z.array(z.string()),
  duplicateDetails: z.array(duplicateDetailSchema),
});
export type ImportResult = z.infer<typeof importResultSchema>;

export const importFieldDefinitionSchema = z.object({
  field: z.string(),
  label: z.string(),
  required: z.boolean(),
  type: z.enum(["text", "phone", "email", "date", "select", "textarea"]),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
});
export type ImportFieldDefinition = z.infer<typeof importFieldDefinitionSchema>;

export const importStepSchema = z.enum([
  "upload",
  "mapping",
  "preview",
  "importing",
  "complete",
]);
export type ImportStep = z.infer<typeof importStepSchema>;

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

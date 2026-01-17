import { z } from "zod";
import { patientSchema } from "./patients";
import { userSchema } from "./users";
import { dosageFormSchema, sigCodeSchema, DosageForm, SigCode } from "./medical";

export const embeddedMedicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  route: z.string().default("PO"),

  // Hospital-Grade Drug Identification
  ndcCode: z.string().optional(), // National Drug Code
  rxNormCui: z.string().optional(), // RxNorm Concept Unique Identifier
  dosageForm: dosageFormSchema.optional(),
  strengthValue: z.number().optional(),
  strengthUnit: z.string().optional(), // e.g., "mg", "mL"

  // Prescription details
  quantity: z.number().optional(),
  refillsAllowed: z.number().min(0).max(11).optional(), // 0-11 refills
  dispenseAsWritten: z.boolean().optional(), // DAW flag
  sigCode: sigCodeSchema.optional(), // Standard sig code

  // Date tracking
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),

  // PRN (as needed) medications
  isPRN: z.boolean().optional(),
  prnInstructions: z.string().optional(), // e.g., "Take for pain"
});
export type EmbeddedMedication = z.infer<typeof embeddedMedicationSchema>;

export type PrescriptionMedication = EmbeddedMedication;




export const medicationSchema = z.object({
    id: z.string(),
    prescriptionId: z.string(),
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    route: z.string(),
    ndcCode: z.string().nullable().optional(),
    rxNormCui: z.string().nullable().optional(),
    dosageForm: z.string().or(dosageFormSchema).nullable().optional(),
    strengthValue: z.number().nullable().optional(),
    strengthUnit: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    refillsAllowed: z.number().nullable().optional(),
    dispenseAsWritten: z.boolean(),
    sigCode: z.string().or(sigCodeSchema).nullable().optional(),
});

export type Medication = z.infer<typeof medicationSchema>;

// Validation Schemas for MedicationValidationController
export const checkDrugInteractionsSchema = z.object({
    medications: z.array(z.object({
        name: z.string(),
        dosage: z.string().optional()
    })),
    patientAllergies: z.array(z.string()).optional()
});

export const validateDosageSchema = z.object({
    medication: z.string(),
    dosage: z.string()
});

export const checkContraindicationsSchema = z.object({
    medication: z.string(),
    patientAllergies: z.array(z.object({
        name: z.string(),
        severity: z.string() // Assuming severity is string based on controller usage
    })).optional(),
    patientConditions: z.array(z.object({
        icdCode: z.string(),
        name: z.string()
    })).optional(),
    currentMedications: z.array(z.string()).optional(),
    isPregnant: z.boolean().optional(),
    renalFunctionCategory: z.string().optional()
});

export const validatePediatricDosageSchema = z.object({
    medication: z.string(),
    dosage: z.string(),
    weightKg: z.number()
});

export const validateRenalDosageSchema = z.object({
    medication: z.string(),
    dosage: z.string(),
    renalFunctionCategory: z.string()
});

export const comprehensiveMedicationCheckSchema = z.object({
    medications: z.array(z.object({
        name: z.string(),
        dosage: z.string()
    })),
    patientAllergies: z.array(z.string()).optional(),
    patientConditions: z.array(z.string()).optional(),
    currentMedications: z.array(z.string()).optional(),
    isPregnant: z.boolean().optional(),
    age: z.number().optional(),
    weight: z.number().optional(),
    renalFunction: z.string().optional()
});
export const prescriptionSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  patientId: z.string(),
  doctorId: z.string().optional(),
  medications: z.array(medicationSchema),
  notes: z.string().optional(),
  instructions: z.string().optional(),
  diagnosis: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  patient: patientSchema.optional(),
  doctor: z.object({ name: z.string() }).optional(),
  // Doctor context snapshot for audit trail (Phase 5)
  doctorName: z.string().optional(),
  doctorEmail: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorRole: z.string().optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
});
export type Prescription = z.infer<typeof prescriptionSchema>;

export const createPrescriptionSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  doctorId: z.string().optional(),
  medications: z.array(embeddedMedicationSchema),
  notes: z.string().optional(),
  instructions: z.string().optional(),
  diagnosis: z.string().optional(),
  doctorName: z.string().optional(),
  doctorEmail: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorRole: z.string().optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;



export const ROUTE_OPTIONS = [
  { value: "PO", label: "PO - Oral", description: "By mouth" },
  { value: "IV", label: "IV - Intravenous", description: "Into vein" },
  { value: "IM", label: "IM - Intramuscular", description: "Into muscle" },
  { value: "SC", label: "SC - Subcutaneous", description: "Under skin" },
  { value: "TOP", label: "TOP - Topical", description: "On skin" },
  { value: "INH", label: "INH - Inhalation", description: "Breathed in" },
  { value: "SL", label: "SL - Sublingual", description: "Under tongue" },
  { value: "NAS", label: "NAS - Nasal", description: "Into nose" },
  { value: "OPH", label: "OPH - Ophthalmic", description: "Into eye" },
  { value: "OT", label: "OT - Otic", description: "Into ear" },
  { value: "PR", label: "PR - Rectal", description: "Into rectum" },
  { value: "TD", label: "TD - Transdermal", description: "Skin patch" },
  { value: "BUC", label: "BUC - Buccal", description: "In cheek" },
  { value: "PV", label: "PV - Vaginal", description: "Into vagina" },
  { value: "NEB", label: "NEB - Nebulized", description: "Via nebulizer" },
] as const;

export type RouteOfAdministration = (typeof ROUTE_OPTIONS)[number]["value"];

// Route labels for display
export const ROUTE_LABELS: Record<RouteOfAdministration, string> = {
  PO: "Oral",
  IV: "Intravenous",
  IM: "Intramuscular",
  SC: "Subcutaneous",
  TOP: "Topical",
  INH: "Inhalation",
  SL: "Sublingual",
  NAS: "Nasal",
  OPH: "Ophthalmic",
  OT: "Otic",
  PR: "Rectal",
  TD: "Transdermal",
  BUC: "Buccal",
  PV: "Vaginal",
  NEB: "Nebulized",
};

/**
 * Categories of patient data collected by the platform.
 *
 * Mirrors the shape of `patientSchema`, `patientMedicalConditionSchema`,
 * `patientAllergySchema`, `patientFamilyHistorySchema`,
 * `patientSocialHistorySchema`, `patientSurgicalHistorySchema`,
 * `comprehensiveVitalsSchema`, and the `Consent` model in
 * `packages/types` / `packages/db/prisma`. Used by the printable consent
 * template so a clinic can disclose, in writing, exactly which data
 * categories will be processed before obtaining patient sign-off.
 *
 * Update this list whenever a new field is added to the patient
 * schemas. The structure is intentionally declarative so it can be
 * audited by compliance reviewers without reading React code.
 */
export interface ConsentDataCategory {
  id: string;
  title: string;
  purpose: string;
  fields: string[];
}

export const CONSENT_DATA_CATEGORIES: ConsentDataCategory[] = [
  {
    id: "identity",
    title: "Identity & Demographics",
    purpose:
      "To register you in the medical record system and uniquely identify your file across visits.",
    fields: [
      "Full name (first, last, preferred)",
      "Date of birth",
      "Gender and pronouns",
      "Medical Record Number (MRN)",
      "Race, ethnicity, preferred language, marital status (optional)",
    ],
  },
  {
    id: "contact",
    title: "Contact Information",
    purpose:
      "To reach you for appointments, results, billing, and follow-up care.",
    fields: [
      "Phone number",
      "Email address",
      "Postal address",
    ],
  },
  {
    id: "emergency",
    title: "Emergency Contact",
    purpose:
      "To contact a trusted person on your behalf in case of a medical emergency.",
    fields: [
      "Emergency contact name",
      "Emergency contact phone",
      "Relationship to patient",
    ],
  },
  {
    id: "insurance",
    title: "Insurance & Billing",
    purpose:
      "To process claims, generate invoices, and verify coverage where applicable.",
    fields: [
      "Insurance provider",
      "Policy and group numbers",
      "Billing records and invoices",
    ],
  },
  {
    id: "vitals",
    title: "Clinical Observations & Vitals",
    purpose:
      "To monitor your health during consultations and inform clinical decisions.",
    fields: [
      "Blood pressure (systolic / diastolic)",
      "Heart rate, respiratory rate, temperature",
      "Oxygen saturation, blood glucose",
      "Pain score, consciousness level",
      "Height, weight, BMI",
    ],
  },
  {
    id: "medical-history",
    title: "Medical History",
    purpose:
      "To deliver safe, informed care, avoid harmful drug interactions, and maintain continuity across encounters.",
    fields: [
      "Active and past medical conditions (with ICD codes)",
      "Allergies and adverse reactions",
      "Current medications and prescriptions",
      "Surgical history and procedures",
      "Immunization / vaccination records",
      "Family medical history",
    ],
  },
  {
    id: "social-history",
    title: "Social & Lifestyle History",
    purpose:
      "To assess lifestyle-related risk factors that may affect diagnosis and treatment.",
    fields: [
      "Smoking, alcohol, and substance use",
      "Occupation and occupational hazards",
      "Exercise and dietary patterns",
    ],
  },
  {
    id: "clinical-care",
    title: "Consultations, Diagnoses & Treatment",
    purpose:
      "To document the care you receive and provide it to other clinicians treating you.",
    fields: [
      "Consultation notes and assessments",
      "Diagnoses and treatment plans",
      "Prescriptions, lab tests, and reports",
      "Procedure records and dental charts (where applicable)",
    ],
  },
  {
    id: "isolation-codes",
    title: "Safety Flags & Advance Directives",
    purpose:
      "To respect your preferences during high-acuity or emergency care.",
    fields: [
      "Isolation precautions",
      "Fall-risk indicators",
      "Code status (DNR / Full code / etc.)",
      "Advance directive references",
    ],
  },
  {
    id: "communication",
    title: "Communication Preferences",
    purpose:
      "To send the reminders, prescriptions, and updates you choose to receive.",
    fields: [
      "WhatsApp consent and timestamp",
      "Email and SMS notification preferences",
      "Preferred language for communication",
    ],
  },
  {
    id: "digital-audit",
    title: "Digital Audit Trail",
    purpose:
      "Required under the Digital Personal Data Protection Act, 2023 to evidence how and when your consent was recorded.",
    fields: [
      "Consent record timestamps",
      "IP address and user agent at the time of consent",
      "Staff member who recorded the entry",
    ],
  },
];

/**
 * Retention summary the patient sees in the consent form footer. Mirrors
 * `DATA_RETENTION_POLICIES` shown in `compliance-settings-constants.ts`.
 */
export interface ConsentRetentionEntry {
  category: string;
  retention: string;
}

export const CONSENT_RETENTION_SUMMARY: ConsentRetentionEntry[] = [
  { category: "Medical records and prescriptions", retention: "7 years" },
  { category: "Appointment history", retention: "5 years" },
  { category: "System audit logs", retention: "3 years" },
];

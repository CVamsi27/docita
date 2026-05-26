/** Per-source row caps for patient timeline fetches (tune here, not inline). */
export const PATIENT_TIMELINE_SOURCE_LIMITS = {
  appointment: 100,
  prescription: 50,
  metricRecord: 50,
  metricRecordValuePreview: 3,
  labTest: 50,
  medicalDocument: 50,
  followUp: 50,
  immunization: 50,
  admission: 20,
  medicationDose: 100,
} as const;

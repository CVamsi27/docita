import type { ParsedMedicalFields } from '@workspace/types';

/**
 * Returns a fully-populated empty ParsedMedicalFields object suitable for
 * parser unit tests. Kept in a shared file so all parser spec files stay
 * in sync when the interface gains new required fields.
 */
export function createEmptyFields(): ParsedMedicalFields {
  return {
    firstName: '',
    lastName: '',
    mrn: '',
    preferredName: '',
    pronouns: '',
    address: '',
    preferredLanguage: '',
    age: '',
    gender: '',
    phoneNumber: '',
    email: '',
    bloodType: '',
    emergencyContact: null,
    dateOfBirth: '',
    visitDate: '',
    invoiceDate: '',
    admissionDate: '',
    clinicName: '',
    doctorName: '',
    diagnosis: '',
    symptoms: [],
    allergies: [],
    medicalHistory: [],
    medications: [],
    vitals: {
      bp: '',
      temp: '',
      pulse: '',
      respiratoryRate: '',
      spO2: '',
      glucose: '',
    },
    labValues: {
      hemoglobin: '',
      glucose: '',
      creatinine: '',
    },
    invoice: {
      total: null,
      tax: null,
      discount: null,
      subtotal: null,
      items: [],
    },
  };
}

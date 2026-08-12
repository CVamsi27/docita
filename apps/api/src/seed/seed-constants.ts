import {
  SEED_PATIENT_PHONE_NUMBER_E164,
  seedPatientPhone,
} from '@workspace/utils';

export { SEED_PATIENT_PHONE_NUMBER_E164, seedPatientPhone };

/**
 * Cross-app seed contract (grill decision 2026-08-08): the canonical Rajesh
 * row ids. Consumers: seed-encounter-factory (canonical appointment plan),
 * seed-invoice-factory (Rajesh invoice routing), seed-patients-encounters.ts
 * (re-export so seed-pdfs.ts queries keep compiling), and seed-whatsapp.ts
 * (payment URL). Change all consumers in the same commit.
 */
export const RAJESH_APPOINTMENT_ID = 'seed-apt-rajesh-completed';
export const RAJESH_PRESCRIPTION_ID = 'seed-prescription-rajesh';
export const RAJESH_INVOICE_ID = 'seed-invoice-rajesh';

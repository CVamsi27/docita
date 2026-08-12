import { describe, expect, it } from '@jest/globals';
import { buildAppointmentPlans } from '@/seed/seed-encounter-factory';
import { SEEDED_PATIENTS } from '@/seed/seed-patient-factory';
import {
  RAJESH_APPOINTMENT_ID,
  RAJESH_INVOICE_ID,
  RAJESH_PRESCRIPTION_ID,
  SEED_PATIENT_PHONE_NUMBER_E164,
  seedPatientPhone,
} from '@/seed/seed-constants';

describe('seed contract parity (e2e layer)', () => {
  it('keeps the portal patient identity single-source', () => {
    expect(SEEDED_PATIENTS[0].firstName).toBe('Rajesh');
    expect(SEED_PATIENT_PHONE_NUMBER_E164).toBe(`+91 ${seedPatientPhone(0)}`);
  });

  it('keeps the Rajesh trio stable for e2e consumers', () => {
    expect(RAJESH_APPOINTMENT_ID).toBe('seed-apt-rajesh-completed');
    expect(RAJESH_PRESCRIPTION_ID).toBe('seed-prescription-rajesh');
    expect(RAJESH_INVOICE_ID).toBe('seed-invoice-rajesh');
  });

  it('keeps the encounter plan totals the e2e seeded state depends on', () => {
    expect(buildAppointmentPlans()).toHaveLength(90);
  });
});

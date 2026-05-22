import type { CurrentUsage } from '@workspace/types';

export interface IClinicUsagePort {
  getCurrentUsage(clinicId: string): Promise<CurrentUsage>;

  trackPrescription(clinicId: string, prescriptionId: string): Promise<void>;
}

export const CLINIC_USAGE_PORT_TOKEN = 'IClinicUsagePort';

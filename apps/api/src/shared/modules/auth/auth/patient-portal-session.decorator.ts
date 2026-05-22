import { SetMetadata } from '@nestjs/common';

export const PATIENT_PORTAL_SESSION_KEY = 'patientPortalSession';

/** Route accepts patient-portal JWT audience (role PATIENT). */
export const PatientPortalSession = () =>
  SetMetadata(PATIENT_PORTAL_SESSION_KEY, true);

export const CLAIM_VALIDATION_REPOSITORY_TOKEN = Symbol(
  'IClaimValidationRepository',
);

export interface InvoiceForClaimValidation {
  id: string;
  appointmentId: string | null;
  patient: { clinicId: string } | null;
}

export interface AppointmentForClaimValidation {
  id: string;
  diagnoses: Array<{ id: string; icdCodeId: string | null }>;
  procedures: Array<{ id: string; cptCodeId: string | null }>;
}

export interface IClaimValidationRepository {
  findInvoiceForClaimReadiness(
    id: string,
  ): Promise<InvoiceForClaimValidation | null>;
  findAppointmentForClaimReadiness(
    id: string,
  ): Promise<AppointmentForClaimValidation | null>;
}

export interface IPortalDocumentsRepository {
  getPrescriptions(
    patientId: string,
    filters: { take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }>;

  getPrescriptionById(
    prescriptionId: string,
    patientId: string,
  ): Promise<unknown | null>;

  getInvoices(
    patientId: string,
    filters: { status?: string; take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }>;

  getActivePrescriptions(patientId: string, take: number): Promise<unknown[]>;

  getOutstandingInvoices(patientId: string, take: number): Promise<unknown[]>;
}

export const PORTAL_DOCUMENTS_REPOSITORY_TOKEN = Symbol(
  'IPortalDocumentsRepository',
);

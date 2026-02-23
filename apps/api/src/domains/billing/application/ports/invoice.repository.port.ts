/**
 * Invoice Repository Port (Interface)
 * Defines contract for invoice persistence
 */

import { Invoice } from '../../core/entities/invoice.entity';

export interface IInvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
  findByClinicId(clinicId: string): Promise<Invoice[]>;
  findByPatientId(patientId: string): Promise<Invoice[]>;
  delete(id: string): Promise<void>;
  update(invoice: Invoice): Promise<void>;
}

export const INVOICE_REPOSITORY_TOKEN = 'IInvoiceRepository';

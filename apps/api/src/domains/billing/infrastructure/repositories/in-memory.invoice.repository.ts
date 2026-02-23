/**
 * In-Memory Invoice Repository (Example Implementation)
 * Shows how to implement IInvoiceRepository port
 *
 * In production, replace with PrismaInvoiceRepository
 * This demonstrates the dependency inversion pattern:
 * - Application depends on IInvoiceRepository (interface)
 * - Infrastructure provides implementation
 * - Easy to swap implementations for testing or different databases
 */

import { Injectable } from '@nestjs/common';
import { Invoice } from '../../core/entities';
import { IInvoiceRepository } from '../../application/ports/invoice.repository.port';
import { InvoiceMapper } from '../mappers/invoice.mapper';

@Injectable()
export class InMemoryInvoiceRepository implements IInvoiceRepository {
  private invoices = new Map<string, Invoice>();

  save(invoice: Invoice): Promise<void> {
    this.invoices.set(invoice.id, invoice);
    return Promise.resolve();
  }

  findById(id: string): Promise<Invoice | null> {
    return Promise.resolve(this.invoices.get(id) ?? null);
  }

  findByClinicId(clinicId: string): Promise<Invoice[]> {
    return Promise.resolve(
      Array.from(this.invoices.values()).filter(
        (invoice) => invoice.clinicId === clinicId,
      ),
    );
  }

  findByPatientId(patientId: string): Promise<Invoice[]> {
    return Promise.resolve(
      Array.from(this.invoices.values()).filter(
        (invoice) => invoice.patientId === patientId,
      ),
    );
  }

  delete(id: string): Promise<void> {
    this.invoices.delete(id);
    return Promise.resolve();
  }

  update(invoice: Invoice): Promise<void> {
    if (!this.invoices.has(invoice.id)) {
      return Promise.reject(new Error(`Invoice ${invoice.id} not found`));
    }
    this.invoices.set(invoice.id, invoice);
    return Promise.resolve();
  }
}

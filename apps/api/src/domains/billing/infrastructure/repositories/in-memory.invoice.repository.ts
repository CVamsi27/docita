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

  async save(invoice: Invoice): Promise<void> {
    this.invoices.set(invoice.id, invoice);
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) ?? null;
  }

  async findByClinicId(clinicId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.clinicId === clinicId,
    );
  }

  async findByPatientId(patientId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.patientId === patientId,
    );
  }

  async delete(id: string): Promise<void> {
    this.invoices.delete(id);
  }

  async update(invoice: Invoice): Promise<void> {
    if (!this.invoices.has(invoice.id)) {
      throw new Error(`Invoice ${invoice.id} not found`);
    }
    this.invoices.set(invoice.id, invoice);
  }
}

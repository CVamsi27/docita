/**
 * Prisma Invoice Repository
 * Production implementation of IInvoiceRepository port
 *
 * Handles persistence using Prisma ORM.
 * Maps between Prisma models and domain entities using InvoiceMapper.
 *
 * Key responsibility:
 * - CRUD operations on invoices
 * - Domain entity conversion (Prisma ↔ Domain)
 * - Transactional operations when needed
 *
 * Dependency diagram:
 * PrismaInvoiceRepository → PrismaService (DB client)
 *                        → InvoiceMapper (Entity conversion)
 *                        → IInvoiceRepository (interface)
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Invoice as PrismaInvoiceModel } from '@workspace/db';
import { Invoice } from '../../core/entities';
import { IInvoiceRepository } from '../../application/ports/invoice.repository.port';
import { InvoiceMapper } from '../mappers/invoice.mapper';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save (create) a new invoice to the database
   *
   * Process:
   * 1. Convert domain entity to Prisma format
   * 2. Create in database
   * 3. Convert back to domain entity (to ensure consistency)
   *
   * @param invoice Domain invoice entity to save
   * @throws BadRequestException if invoice data is invalid
   */
  async save(invoice: Invoice): Promise<void> {
    try {
      const persistenceData = InvoiceMapper.toPersistence(invoice);

      await this.prisma.invoice.create({
        data: persistenceData as any,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to save invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find an invoice by ID
   *
   * @param id Invoice ID
   * @returns Domain entity if found, null otherwise
   * @throws If database query fails
   */
  async findById(id: string): Promise<Invoice | null> {
    try {
      const prismaInvoice = await this.prisma.invoice.findUnique({
        where: { id },
        include: {
          appointment: {
            select: {
              clinicId: true,
            },
          },
        },
      });

      if (!prismaInvoice) {
        return null;
      }

      // Add clinicId from appointment context if available
      const invoiceWithClinicId: PrismaInvoiceModel & { clinicId?: string } =
        {
          ...prismaInvoice,
          clinicId: (prismaInvoice.appointment as any)?.clinicId,
        };

      return InvoiceMapper.toDomain(invoiceWithClinicId as any);
    } catch (error) {
      throw new BadRequestException(
        `Failed to find invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find all invoices for a clinic
   *
   * @param clinicId Clinic context
   * @returns Array of domain invoice entities
   */
  async findByClinicId(clinicId: string): Promise<Invoice[]> {
    try {
      // Query appointments by clinic, then get their invoices
      const appointments = await this.prisma.appointment.findMany({
        where: { clinicId },
        select: { id: true },
      });

      const appointmentIds = appointments.map((a: any) => a.id);

      if (appointmentIds.length === 0) {
        return [];
      }

      const prismaInvoices = await this.prisma.invoice.findMany({
        where: {
          appointmentId: {
            in: appointmentIds,
          },
        },
      });

      // Map back to domain entities, adding clinicId context
      return prismaInvoices.map((inv: any) =>
        InvoiceMapper.toDomain({
          ...inv,
          clinicId,
        } as any),
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to find invoices by clinic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find all invoices for a patient
   *
   * @param patientId Patient ID
   * @returns Array of domain invoice entities
   */
  async findByPatientId(patientId: string): Promise<Invoice[]> {
    try {
      const prismaInvoices = await this.prisma.invoice.findMany({
        where: { patientId },
        include: {
          appointment: {
            select: {
              clinicId: true,
            },
          },
        },
      });

      return prismaInvoices.map((inv: any) =>
        InvoiceMapper.toDomain({
          ...inv,
          clinicId: (inv.appointment as any)?.clinicId,
        } as any),
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to find invoices by patient: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update an existing invoice
   *
   * Process:
   * 1. Verify invoice exists
   * 2. Convert domain entity to Prisma format
   * 3. Update in database with optimistic concurrency control (version)
   *
   * @param invoice Domain invoice entity with updated data
   * @throws NotFoundException if invoice doesn't exist
   * @throws BadRequestException if version conflict (concurrent update)
   */
  async update(invoice: Invoice): Promise<void> {
    try {
      const existingInvoice = await this.prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      if (!existingInvoice) {
        throw new NotFoundException(`Invoice ${invoice.id} not found`);
      }

      // Check version for optimistic concurrency control
      if (
        invoice.version &&
        existingInvoice.version !== invoice.version
      ) {
        throw new BadRequestException(
          'Invoice was modified by another user. Please refresh and try again.',
        );
      }

      const persistenceData = InvoiceMapper.toPersistence(invoice);

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          ...persistenceData,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete an invoice by ID
   *
   * @param id Invoice ID to delete
   * @throws NotFoundException if invoice doesn't exist
   */
  async delete(id: string): Promise<void> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${id} not found`);
      }

      await this.prisma.invoice.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

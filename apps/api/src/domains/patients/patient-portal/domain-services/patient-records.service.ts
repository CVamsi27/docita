/**
 * Patient Records Service (SRP)
 *
 * Single Responsibility: Patient medical record access (appointments, prescriptions, invoices).
 * Extracted from PatientPortalService to follow Single Responsibility Principle.
 *
 * Design Patterns:
 * - Repository-like query building (Open/Closed for new filters)
 * - Pagination encapsulation (reusable pattern)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  GetPatientAppointmentsQueryDto,
  GetPatientPrescriptionsQueryDto,
  GetPatientInvoicesQueryDto,
} from '../dto/patient-portal.dto';

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

@Injectable()
export class PatientRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get patient appointments with filters
   * Uses Promise.all for parallel count + data queries
   */
  async getAppointments(
    patientId: string,
    filters: GetPatientAppointmentsQueryDto,
  ): Promise<PaginatedResult<any>> {
    const { status, startDate, endDate, limit = 20, offset = 0 } = filters;

    const where = this.buildAppointmentWhere(
      patientId,
      status,
      startDate,
      endDate,
    );

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          type: true,
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
              profilePhotoUrl: true,
            },
          },
          prescription: {
            select: {
              id: true,
              medications: {
                select: { name: true, dosage: true },
              },
            },
          },
          invoice: {
            select: { id: true, total: true, status: true },
          },
        },
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  /**
   * Get single appointment details (security: ensures patient ownership)
   */
  async getAppointmentById(patientId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        chiefComplaint: true,
        notes: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            profilePhotoUrl: true,
            bio: true,
          },
        },
        prescription: {
          select: { id: true, medications: true },
        },
        invoice: {
          select: { id: true, total: true, status: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  /**
   * Get patient prescriptions with pagination
   */
  async getPrescriptions(
    patientId: string,
    filters: GetPatientPrescriptionsQueryDto,
  ): Promise<PaginatedResult<any>> {
    const { limit = 20, offset = 0 } = filters;

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where: { patientId },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          medications: {
            select: {
              id: true,
              name: true,
              dosage: true,
              frequency: true,
              duration: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
              registrationNumber: true,
            },
          },
          appointment: {
            select: { id: true, startTime: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.prescription.count({ where: { patientId } }),
    ]);

    return {
      data: prescriptions,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  /**
   * Get single prescription details (security: ensures patient ownership)
   */
  async getPrescriptionById(patientId: string, prescriptionId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        patientId,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        medications: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            registrationNumber: true,
            signatureUrl: true,
          },
        },
        appointment: {
          select: { id: true, startTime: true, chiefComplaint: true },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  /**
   * Get patient invoices with filters
   */
  async getInvoices(
    patientId: string,
    filters: GetPatientInvoicesQueryDto,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { status, limit = 20, offset = 0 } = filters;

    const where: Record<string, unknown> = { patientId };
    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  // ========================================================================
  // Private: Query Builder Helpers (Open/Closed Principle)
  // ========================================================================

  private buildAppointmentWhere(
    patientId: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Record<string, unknown> = { patientId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.startTime = {} as Record<string, Date>;
      if (startDate)
        (where.startTime as Record<string, Date>).gte = new Date(startDate);
      if (endDate)
        (where.startTime as Record<string, Date>).lte = new Date(endDate);
    }

    return where;
  }
}

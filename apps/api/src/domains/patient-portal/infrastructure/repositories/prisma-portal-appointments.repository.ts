import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IPortalAppointmentsRepository } from '@/domains/patient-portal/core/repositories/portal-appointments.repository.interface';

@Injectable()
export class PrismaPortalAppointmentsRepository
  implements IPortalAppointmentsRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async getUpcomingAppointments(
    patientId: string,
    clinicId: string,
    from: Date,
    take: number,
  ): Promise<unknown[]> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () =>
      this.prisma.appointment.findMany({
        where: {
          patientId,
          clinicId,
          startTime: { gte: from },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        orderBy: { startTime: 'asc' },
        take,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          type: true,
          chiefComplaint: true,
          doctor: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
        },
      }),
    );
  }

  async getAppointments(
    patientId: string,
    clinicId: string,
    filters: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      take: number;
      skip: number;
    },
  ): Promise<{ items: unknown[]; total: number }> {
    const where: Record<string, unknown> = { patientId, clinicId };
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.startTime = {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: filters.endDate } : {}),
      };
    }

    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () => {
      const [items, total] = await Promise.all([
        this.prisma.appointment.findMany({
          where,
          orderBy: { startTime: 'desc' },
          take: filters.take,
          skip: filters.skip,
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            type: true,
            chiefComplaint: true,
            notes: true,
            doctor: { select: { id: true, name: true } },
            clinic: { select: { id: true, name: true } },
          },
        }),
        this.prisma.appointment.count({ where }),
      ]);
      return { items, total };
    });
  }

  async getAppointmentById(
    appointmentId: string,
    patientId: string,
    clinicId: string,
  ): Promise<unknown | null> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () =>
      this.prisma.appointment.findFirst({
        where: { id: appointmentId, patientId, clinicId },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          type: true,
          chiefComplaint: true,
          notes: true,
          encounterSummary: true,
          provisionalDiagnosis: true,
          finalDiagnosis: true,
          doctor: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true, address: true } },
          prescription: {
            select: {
              id: true,
              medications: {
                select: {
                  id: true,
                  name: true,
                  dosage: true,
                  frequency: true,
                  duration: true,
                  specialInstructions: true,
                },
              },
            },
          },
          invoice: { select: { id: true, total: true, status: true } },
        },
      }),
    );
  }
}

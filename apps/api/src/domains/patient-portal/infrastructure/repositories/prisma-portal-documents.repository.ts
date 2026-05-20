import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IPortalDocumentsRepository } from '@/domains/patient-portal/core/repositories/portal-documents.repository.interface';

@Injectable()
export class PrismaPortalDocumentsRepository implements IPortalDocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPrescriptions(
    patientId: string,
    filters: { take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }> {
    return this.prisma.runUnrestricted(async () => {
      const [items, total] = await Promise.all([
        this.prisma.prescription.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          take: filters.take,
          skip: filters.skip,
          select: {
            id: true,
            createdAt: true,
            instructions: true,
            doctorName: true,
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
            doctor: { select: { id: true, name: true } },
          },
        }),
        this.prisma.prescription.count({ where: { patientId } }),
      ]);
      return { items, total };
    });
  }

  async getPrescriptionById(
    prescriptionId: string,
    patientId: string,
  ): Promise<unknown | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.prescription.findFirst({
        where: { id: prescriptionId, patientId },
        select: {
          id: true,
          createdAt: true,
          instructions: true,
          doctorName: true,
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
          doctor: { select: { id: true, name: true } },
          appointment: {
            select: {
              id: true,
              clinic: { select: { id: true, name: true } },
            },
          },
        },
      }),
    );
  }

  async getInvoices(
    patientId: string,
    filters: { status?: string; take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }> {
    const where: Record<string, unknown> = { patientId };
    if (filters.status) where.status = filters.status;

    return this.prisma.runUnrestricted(async () => {
      const [items, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.take,
          skip: filters.skip,
          select: {
            id: true,
            total: true,
            status: true,
            items: true,
            createdAt: true,
          },
        }),
        this.prisma.invoice.count({ where }),
      ]);
      return { items, total };
    });
  }

  async getActivePrescriptions(
    patientId: string,
    take: number,
  ): Promise<unknown[]> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          createdAt: true,
          instructions: true,
          doctorName: true,
          medications: {
            select: { id: true, name: true, dosage: true, frequency: true },
            take: 3,
          },
          doctor: { select: { id: true, name: true } },
        },
      }),
    );
  }

  async getOutstandingInvoices(
    patientId: string,
    take: number,
  ): Promise<unknown[]> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.invoice.findMany({
        where: { patientId, status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, total: true, status: true, createdAt: true },
      }),
    );
  }
}

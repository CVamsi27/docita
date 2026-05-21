import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  applyInMemoryFallbackFilters,
  mapAppointmentActivityRow,
  mapInvoiceActivityRow,
  mapPatientActivityRow,
} from './internal-log-mapping.helpers';
import type {
  InternalLogFilters,
  InternalLogQueryResult,
} from './internal-log.types';

@Injectable()
export class InternalLogActivityFallbackService {
  constructor(private readonly prisma: PrismaService) {}

  async queryRecentActivityLogs(
    limit: number,
    offset: number,
    filters: InternalLogFilters,
  ): Promise<InternalLogQueryResult> {
    const [appointments, patients, invoices] = await Promise.all([
      this.prisma.appointment.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          status: true,
          clinic: { select: { name: true } },
        },
      }),
      this.prisma.patient.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          firstName: true,
          lastName: true,
          clinic: { select: { name: true } },
        },
      }),
      this.prisma.invoice.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          status: true,
          total: true,
        },
      }),
    ]);

    const logs = [
      ...appointments.map(mapAppointmentActivityRow),
      ...patients.map(mapPatientActivityRow),
      ...invoices.map(mapInvoiceActivityRow),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const filteredLogs = applyInMemoryFallbackFilters(logs, filters);

    return {
      data: filteredLogs.slice(offset, offset + limit),
      total: filteredLogs.length,
    };
  }
}

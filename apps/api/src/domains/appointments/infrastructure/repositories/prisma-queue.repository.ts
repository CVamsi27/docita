import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, QueueTokenStatus } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';

const QUEUE_TOKEN_STATUS_VALUES = Object.values(QueueTokenStatus);
import {
  IQueueRepository,
  QueueTokenWithRelations,
  AppointmentForCheckIn,
} from '@/domains/appointments/core/repositories/queue.repository.interface';

const TOKEN_WITH_RELATIONS_INCLUDE = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      gender: true,
      dateOfBirth: true,
    },
  },
  doctor: { select: { id: true, name: true } },
  appointment: {
    select: {
      id: true,
      type: true,
      chiefComplaint: true,
      doctor: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class PrismaQueueRepository implements IQueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findTodayTokens(
    clinicId: string,
    fromDate: Date,
    toDate: Date,
    doctorId?: string,
    statusIn?: string[],
    search?: string,
  ): Promise<QueueTokenWithRelations[]> {
    const statusFilter =
      statusIn && statusIn.length > 0
        ? statusIn.flatMap((status) => {
            const parsed = parseStringEnumMember(
              QUEUE_TOKEN_STATUS_VALUES,
              status,
            );
            return parsed ? [parsed] : [];
          })
        : [];
    const where: Prisma.QueueTokenWhereInput = {
      clinicId,
      createdAt: { gte: fromDate, lt: toDate },
      ...(statusFilter.length > 0 ? { status: { in: statusFilter } } : {}),
      ...(doctorId ? { doctorId } : {}),
      ...(search
        ? {
            OR: [
              {
                patient: {
                  firstName: { contains: search, mode: 'insensitive' },
                },
              },
              {
                patient: {
                  lastName: { contains: search, mode: 'insensitive' },
                },
              },
              { patient: { phoneNumber: { contains: search } } },
            ],
          }
        : {}),
    };

    // No `take`: the result is bounded by (clinicId, single-day createdAt
    // window). One clinic's token count for one day is small by construction,
    // so paginating here would fragment the queue view rather than protect it.
    const rows = await this.getReadClient().queueToken.findMany({
      where,
      include: TOKEN_WITH_RELATIONS_INCLUDE,
      orderBy: [{ priority: 'desc' }, { tokenNumber: 'asc' }],
    });
    return rows satisfies QueueTokenWithRelations[];
  }

  async findAppointmentForCheckIn(
    appointmentId: string,
    clinicId: string,
  ): Promise<AppointmentForCheckIn | null> {
    const row = await this.getReadClient().appointment.findFirst({
      where: { id: appointmentId, clinicId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        // jscpd:ignore-start
        startTime: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });
    // jscpd:ignore-end
    if (!row) return null;
    return row satisfies AppointmentForCheckIn;
  }

  async findExistingToken(appointmentId: string, clinicId: string) {
    return this.getReadClient().queueToken.findFirst({
      where: { appointmentId, clinicId },
    });
  }

  async findLastTodayTokenNumber(
    clinicId: string,
    fromDate: Date,
  ): Promise<number> {
    const last = await this.getReadClient().queueToken.findFirst({
      where: { clinicId, createdAt: { gte: fromDate } },
      orderBy: { tokenNumber: 'desc' },
    });
    return last?.tokenNumber ?? 0;
  }

  async createToken(data: Prisma.QueueTokenUncheckedCreateInput) {
    return this.prisma.queueToken.create({ data });
  }

  async findTokenByIdAndClinic(id: string, clinicId: string) {
    return this.getReadClient().queueToken.findFirst({
      where: { id, clinicId },
    });
  }

  async updateToken(id: string, data: Prisma.QueueTokenUpdateInput) {
    return this.prisma.queueToken.update({ where: { id }, data });
  }

  async cancelTodayActiveTokens(clinicId: string, fromDate: Date) {
    await this.prisma.queueToken.updateMany({
      where: {
        clinicId,
        createdAt: { gte: fromDate },
        status: { in: ['WAITING', 'IN_PROGRESS'] },
      },
      data: { status: 'CANCELLED' },
    });
  }
}

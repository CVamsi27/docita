import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, QueueToken, QueueTokenStatus } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';

const QUEUE_TOKEN_STATUS_VALUES = Object.values(QueueTokenStatus);

/** Midnight UTC of the day containing `date`; matches the allocation day scope. */
function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
import {
  IQueueRepository,
  QueueTokenWithRelations,
  AppointmentForCheckIn,
  QueueTokenAllocationInput,
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

  /**
   * Allocates the next token number for a clinic and inserts the token.
   *
   * The previous read-then-write (`findLastTodayTokenNumber` then
   * `createToken`) let two parallel check-ins read the same maximum and both
   * insert the same number. Allocation here runs inside one transaction that
   * holds an advisory lock scoped to (clinic, day), so the read of the current
   * maximum and the insert cannot interleave. The
   * (clinicId, tokenDay, tokenNumber) unique constraint is the backstop.
   *
   * `tokenDay` is derived from `fromDate` (the clinic-local day start the
   * caller already resolved), so numbers continue to restart each day.
   */
  async allocateToken(
    data: QueueTokenAllocationInput,
    fromDate: Date,
  ): Promise<QueueToken> {
    const tokenDay = startOfDay(fromDate);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`queue-token:${data.clinicId}:${tokenDay.toISOString().slice(0, 10)}`}))`;

      const last = await tx.queueToken.findFirst({
        where: {
          clinicId: data.clinicId,
          tokenDay: { equals: tokenDay },
        },
        orderBy: { tokenNumber: 'desc' },
        select: { tokenNumber: true },
      });

      return tx.queueToken.create({
        data: { ...data, tokenNumber: (last?.tokenNumber ?? 0) + 1, tokenDay },
      });
    });
  }

  async findTokenByIdAndClinic(id: string, clinicId: string) {
    return this.getReadClient().queueToken.findFirst({
      where: { id, clinicId },
    });
  }

  async transitionTokenStatus(
    id: string,
    expectedStatuses: QueueTokenStatus[],
    data: Prisma.QueueTokenUpdateManyMutationInput,
  ): Promise<QueueToken | null> {
    const result = await this.prisma.queueToken.updateMany({
      where: { id, status: { in: expectedStatuses } },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.queueToken.findUnique({ where: { id } });
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

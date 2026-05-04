import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
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
  ): Promise<QueueTokenWithRelations[]> {
    const where = {
      clinicId,
      createdAt: { gte: fromDate, lt: toDate },
      ...(statusIn && statusIn.length > 0 && { status: { in: statusIn } }),
      ...(doctorId && { doctorId }),
    } as Prisma.QueueTokenWhereInput;

    return this.getReadClient().queueToken.findMany({
      where,
      include: TOKEN_WITH_RELATIONS_INCLUDE,
      orderBy: [{ priority: 'desc' }, { tokenNumber: 'asc' }],
    }) as Promise<QueueTokenWithRelations[]>;
  }

  async findAppointmentForCheckIn(
    appointmentId: string,
    clinicId: string,
  ): Promise<AppointmentForCheckIn | null> {
    return this.getReadClient().appointment.findFirst({
      where: { id: appointmentId, clinicId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
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
    }) as Promise<AppointmentForCheckIn | null>;
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

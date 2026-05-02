import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IAppointmentRepository,
  AppointmentListItem,
  AppointmentSearchParams,
  PaginatedResult,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentMapper } from '@/domains/appointments/infrastructure/mappers/appointment.mapper';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import {
  Prisma,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';

const APPOINTMENT_STATUS_TO_PRISMA: Record<
  AppointmentStatusEnum,
  PrismaAppointmentStatus
> = {
  [AppointmentStatusEnum.SCHEDULED]: PrismaAppointmentStatus.SCHEDULED,
  [AppointmentStatusEnum.CONFIRMED]: PrismaAppointmentStatus.CONFIRMED,
  [AppointmentStatusEnum.ARRIVED]: PrismaAppointmentStatus.CONFIRMED,
  [AppointmentStatusEnum.IN_PROGRESS]: PrismaAppointmentStatus.IN_PROGRESS,
  [AppointmentStatusEnum.COMPLETED]: PrismaAppointmentStatus.COMPLETED,
  [AppointmentStatusEnum.CANCELLED]: PrismaAppointmentStatus.CANCELLED,
  [AppointmentStatusEnum.NOSHOW]: PrismaAppointmentStatus.NO_SHOW,
};

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findAll(
    params: AppointmentSearchParams,
  ): Promise<PaginatedResult<AppointmentListItem>> {
    const {
      clinicId,
      startDate,
      endDate,
      patientId,
      doctorId,
      status,
      search,
      cursor,
      limit = 20,
    } = params;

    const where: Prisma.AppointmentWhereInput = {
      clinicId,
    };

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status && status.length > 0) {
      where.status = {
        in: status.map((value) => APPOINTMENT_STATUS_TO_PRISMA[value]),
      };
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    if (search) {
      where.OR = [
        { patient: { firstName: { contains: search, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search, mode: 'insensitive' } } },
        { patient: { phoneNumber: { contains: search } } },
      ];
    }

    try {
      const readClient = this.getReadClient();
      const [total, items] = await Promise.all([
        readClient.appointment.count({ where }),
        readClient.appointment.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
          orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            doctor: {
              select: { id: true, name: true },
            },
          },
        }),
      ]);

      const hasMore = items.length > limit;
      const resultItems = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore
        ? resultItems[resultItems.length - 1].id
        : undefined;

      return {
        items: resultItems.map((item) => AppointmentMapper.toListItem(item)),
        nextCursor,
        hasMore,
        count: total,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to find appointments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findById(id: string, clinicId: string): Promise<Appointment | null> {
    const item = await this.getReadClient().appointment.findFirst({
      where: { id, clinicId },
    });

    if (!item) return null;
    return AppointmentMapper.toDomain(item);
  }

  async save(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);

    await this.prisma.appointment.create({
      data: data,
    });
  }

  async update(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);
    const { id, clinicId, ...updateData } = data;

    if (!clinicId || typeof clinicId !== 'string') {
      throw new BadRequestException('Appointment clinicId is required');
    }

    const result = await this.prisma.appointment.updateMany({
      where: { id, clinicId },
      data: {
        ...updateData,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new BadRequestException(`Appointment ${id} not found`);
    }
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.appointment.deleteMany({
      where: { id, clinicId },
    });
  }

  async findByPatientId(
    patientId: string,
    clinicId: string,
  ): Promise<Appointment[]> {
    const items = await this.getReadClient().appointment.findMany({
      where: { patientId, clinicId },
      orderBy: { startTime: 'desc' },
    });

    return items.map((item) => AppointmentMapper.toDomain(item));
  }

  async findByDoctorId(
    doctorId: string,
    date: Date,
    clinicId: string,
  ): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const items = await this.getReadClient().appointment.findMany({
      where: {
        doctorId,
        clinicId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return items.map((item) => AppointmentMapper.toDomain(item));
  }

  async exists(id: string, clinicId: string): Promise<boolean> {
    const count = await this.getReadClient().appointment.count({
      where: { id, clinicId },
    });
    return count > 0;
  }

  async findAppointmentsForSlots(
    clinicId: string,
    doctorIds: string[],
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<Array<{ doctorId: string; startTime: Date; endTime: Date }>> {
    const appointments = await this.getReadClient().appointment.findMany({
      where: {
        clinicId,
        doctorId: { in: doctorIds },
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: [
            PrismaAppointmentStatus.CANCELLED,
            PrismaAppointmentStatus.NO_SHOW,
          ],
        },
      },
      select: {
        doctorId: true,
        startTime: true,
        endTime: true,
      },
    });

    return appointments;
  }
}

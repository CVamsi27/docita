import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IAppointmentReadRepository,
  AppointmentListItem,
  AppointmentSearchParams,
  PaginatedResult,
} from '@/domains/appointments/core/repositories/appointment-read.repository.interface';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import {
  AppointmentMapper,
  PRISMA_TO_DOMAIN_STATUS,
} from '@/domains/appointments/infrastructure/mappers/appointment.mapper';
import { getClinicLocalDayUtcBounds } from '@/shared/common/utils/clinic-calendar-bounds';
import {
  Prisma,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { APPOINTMENT_STATUS_TO_PRISMA } from './appointment-status-prisma.maps';
import {
  DEFAULT_TIMEZONE,
  formatUtcInstantAsClinicPickerIso,
} from '@workspace/utils';

@Injectable()
export class PrismaAppointmentReadRepository implements IAppointmentReadRepository {
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
      intersectCalendarRange,
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

    if (
      intersectCalendarRange &&
      startDate !== undefined &&
      endDate !== undefined
    ) {
      where.AND = [
        { startTime: { lt: endDate } },
        { endTime: { gt: startDate } },
      ];
    } else if (startDate || endDate) {
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
            reminders: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                type: true,
                status: true,
                sentAt: true,
                error: true,
                createdAt: true,
              },
            },
            responses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                responseType: true,
                responseTime: true,
                delayMinutes: true,
                patientMessage: true,
              },
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
    timezone: string = DEFAULT_TIMEZONE,
  ): Promise<Appointment[]> {
    const pickerDateStr = formatUtcInstantAsClinicPickerIso(date, timezone);
    const bounds = getClinicLocalDayUtcBounds(pickerDateStr, timezone);
    if (!bounds) {
      return [];
    }

    const items = await this.getReadClient().appointment.findMany({
      where: {
        doctorId,
        clinicId,
        startTime: {
          gte: bounds.rangeStart,
          lt: bounds.rangeEndExclusive,
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
    rangeStart: Date,
    rangeEndExclusive: Date,
  ): Promise<Array<{ doctorId: string; startTime: Date; endTime: Date }>> {
    return this.getReadClient().appointment.findMany({
      where: {
        clinicId,
        doctorId: { in: doctorIds },
        AND: [
          { startTime: { lt: rangeEndExclusive } },
          { endTime: { gt: rangeStart } },
        ],
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
  }

  async findClinicTier(
    clinicId: string,
  ): Promise<{ tier: string; planMode: string | null } | null> {
    return this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true, planMode: true },
    });
  }

  async findClinicTimezone(clinicId: string): Promise<string | null> {
    const row = await this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    return row?.timezone?.trim() || null;
  }

  async findForConsultationStart(id: string, clinicId: string) {
    const row = await this.getReadClient().appointment.findFirst({
      where: { id, clinicId },
      select: {
        id: true,
        clinicId: true,
        doctorId: true,
        status: true,
        queueToken: {
          select: {
            id: true,
            status: true,
            calledAt: true,
            consultationStart: true,
          },
        },
      },
    });
    if (!row) return null;
    return {
      ...row,
      status: PRISMA_TO_DOMAIN_STATUS[row.status],
    };
  }

  async findForUpdate(id: string, clinicId: string) {
    return this.getReadClient().appointment.findFirst({
      where: { id, clinicId },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        doctorId: true,
        startTime: true,
        endTime: true,
      },
    });
  }
}

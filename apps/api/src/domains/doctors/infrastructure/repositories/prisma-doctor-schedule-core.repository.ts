import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IDoctorScheduleCoreRepository } from '@/domains/doctors/core/repositories/doctor-schedule-core.repository.interface';
import { Prisma, DayOfWeek } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import { isPrismaTableDoesNotExistForModel } from '@/shared/common/utils/prisma-missing-table';

function parseDayOfWeek(dayOfWeek: string): DayOfWeek {
  const parsed = parseStringEnumMember(Object.values(DayOfWeek), dayOfWeek);
  if (!parsed) {
    throw new Error(`Invalid dayOfWeek: ${dayOfWeek}`);
  }
  return parsed;
}

@Injectable()
export class PrismaDoctorScheduleCoreRepository implements IDoctorScheduleCoreRepository {
  private readonly logger = new Logger(PrismaDoctorScheduleCoreRepository.name);

  constructor(private prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findSchedules(doctorId: string, clinicId?: string) {
    const where: Prisma.DoctorScheduleWhereInput = { doctorId };
    if (clinicId) {
      where.clinicId = clinicId;
    }

    return this.getReadClient().doctorSchedule.findMany({
      where,
// jscpd:ignore-start
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        clinic: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findSchedulesByClinic(clinicId: string) {
// jscpd:ignore-end
    return this.getReadClient().doctorSchedule.findMany({
      where: { clinicId, isActive: true },
      orderBy: [
        { doctorId: 'asc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
      include: {
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });
  }

  async findScheduleByDoctorClinicDay(
    doctorId: string,
    clinicId: string,
    dayOfWeek: string,
  ) {
    return this.getReadClient().doctorSchedule.findUnique({
      where: {
        doctorId_clinicId_dayOfWeek: {
          doctorId,
          clinicId,
          dayOfWeek: parseDayOfWeek(dayOfWeek),
        },
      },
    });
  }

  async findSchedulesForSlotGeneration(where: Prisma.DoctorScheduleWhereInput) {
    return this.getReadClient().doctorSchedule.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });
  }

  async findClinicWeeklyForSlotGeneration(params: {
    clinicId: string;
    dayOfWeek: string;
  }) {
    try {
      return await this.getReadClient().clinicWeeklySchedule.findMany({
        where: {
          clinicId: params.clinicId,
          dayOfWeek: parseDayOfWeek(params.dayOfWeek),
          isActive: true,
        },
      });
    } catch (error) {
      if (isPrismaTableDoesNotExistForModel(error, 'ClinicWeeklySchedule')) {
        this.logger.warn(
          'ClinicWeeklySchedule table is missing; apply @workspace/db migrations to enable clinic default hours. Slot generation falls back to doctor schedules only.',
        );
        return [];
      }
      throw error;
    }
  }

  async hasAnyClinicWeeklySchedule(clinicId: string): Promise<boolean> {
    try {
      const row = await this.getReadClient().clinicWeeklySchedule.findFirst({
        where: { clinicId },
        select: { id: true },
      });
      return row != null;
    } catch (error) {
      if (isPrismaTableDoesNotExistForModel(error, 'ClinicWeeklySchedule')) {
        return false;
      }
      throw error;
    }
  }

  async createSchedule(data: Prisma.DoctorScheduleCreateInput) {
// jscpd:ignore-start
    return this.prisma.doctorSchedule.create({
      data,
      include: {
        doctor: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateSchedule(id: string, data: Prisma.DoctorScheduleUpdateInput) {
    return this.prisma.doctorSchedule.update({
      where: { id },
      data,
      include: {
        doctor: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findScheduleById(id: string) {
// jscpd:ignore-end
    return this.getReadClient().doctorSchedule.findUnique({
      where: { id },
    });
  }

  async deleteSchedule(id: string) {
    await this.prisma.doctorSchedule.delete({ where: { id } });
  }

  async deleteManySchedules(doctorId: string, clinicId: string) {
    await this.prisma.doctorSchedule.deleteMany({
      where: { doctorId, clinicId },
    });
  }

  async createManySchedules(data: Prisma.DoctorScheduleCreateManyInput[]) {
    await this.prisma.doctorSchedule.createMany({
      data,
    });
  }

  async findClinicTimezone(clinicId: string): Promise<string | null> {
    const clinic = await this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    return clinic?.timezone ?? null;
  }
}

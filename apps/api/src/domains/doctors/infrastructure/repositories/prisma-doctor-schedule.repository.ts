import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IDoctorScheduleRepository } from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import { Prisma, DayOfWeek } from '@workspace/db';

@Injectable()
export class PrismaDoctorScheduleRepository implements IDoctorScheduleRepository {
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
          dayOfWeek: dayOfWeek as DayOfWeek,
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

  async createSchedule(data: Prisma.DoctorScheduleCreateInput) {
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

  async findTimeOffs(where: Prisma.DoctorTimeOffWhereInput) {
    return this.getReadClient().doctorTimeOff.findMany({
      where,
      orderBy: { startDate: 'asc' },
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

  async findTimeOffsForSlots(where: Prisma.DoctorTimeOffWhereInput) {
    return this.getReadClient().doctorTimeOff.findMany({
      where,
    });
  }

  async createTimeOff(data: Prisma.DoctorTimeOffCreateInput) {
    return this.prisma.doctorTimeOff.create({
      data,
      include: {
        doctor: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findTimeOffById(id: string) {
    return this.getReadClient().doctorTimeOff.findUnique({
      where: { id },
    });
  }

  async deleteTimeOff(id: string) {
    await this.prisma.doctorTimeOff.delete({ where: { id } });
  }
}

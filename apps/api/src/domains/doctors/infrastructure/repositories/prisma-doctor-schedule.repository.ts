import { Injectable } from '@nestjs/common';
import { IDoctorScheduleRepository } from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import { Prisma } from '@workspace/db';
import { PrismaDoctorScheduleCoreRepository } from './prisma-doctor-schedule-core.repository';
import { PrismaDoctorTimeOffRepository } from './prisma-doctor-time-off.repository';

@Injectable()
export class PrismaDoctorScheduleRepository implements IDoctorScheduleRepository {
  constructor(
    private readonly schedules: PrismaDoctorScheduleCoreRepository,
    private readonly timeOffs: PrismaDoctorTimeOffRepository,
  ) {}

  findSchedules(doctorId: string, clinicId?: string) {
    return this.schedules.findSchedules(doctorId, clinicId);
  }

  findSchedulesByClinic(clinicId: string) {
    return this.schedules.findSchedulesByClinic(clinicId);
  }

  findScheduleByDoctorClinicDay(
    doctorId: string,
    clinicId: string,
    dayOfWeek: string,
  ) {
    return this.schedules.findScheduleByDoctorClinicDay(
      doctorId,
      clinicId,
      dayOfWeek,
    );
  }

  findSchedulesForSlotGeneration(where: Prisma.DoctorScheduleWhereInput) {
    return this.schedules.findSchedulesForSlotGeneration(where);
  }

  findClinicWeeklyForSlotGeneration(params: {
    clinicId: string;
    dayOfWeek: string;
  }) {
    return this.schedules.findClinicWeeklyForSlotGeneration(params);
  }

  hasAnyClinicWeeklySchedule(clinicId: string) {
    return this.schedules.hasAnyClinicWeeklySchedule(clinicId);
  }

  createSchedule(data: Prisma.DoctorScheduleCreateInput) {
    return this.schedules.createSchedule(data);
  }

  updateSchedule(id: string, data: Prisma.DoctorScheduleUpdateInput) {
    return this.schedules.updateSchedule(id, data);
  }

  findScheduleById(id: string) {
    return this.schedules.findScheduleById(id);
  }

  deleteSchedule(id: string) {
    return this.schedules.deleteSchedule(id);
  }

  deleteManySchedules(doctorId: string, clinicId: string) {
    return this.schedules.deleteManySchedules(doctorId, clinicId);
  }

  createManySchedules(data: Prisma.DoctorScheduleCreateManyInput[]) {
    return this.schedules.createManySchedules(data);
  }

  findTimeOffs(where: Prisma.DoctorTimeOffWhereInput) {
    return this.timeOffs.findTimeOffs(where);
  }

  findTimeOffsForSlots(where: Prisma.DoctorTimeOffWhereInput) {
    return this.timeOffs.findTimeOffsForSlots(where);
  }

  findDoctorIdsWithFullDayTimeOffOverlappingRange(
    clinicId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    return this.timeOffs.findDoctorIdsWithFullDayTimeOffOverlappingRange(
      clinicId,
      rangeStart,
      rangeEnd,
    );
  }

  createTimeOff(data: Prisma.DoctorTimeOffCreateInput) {
    return this.timeOffs.createTimeOff(data);
  }

  findTimeOffById(id: string) {
    return this.timeOffs.findTimeOffById(id);
  }

  deleteTimeOff(id: string) {
    return this.timeOffs.deleteTimeOff(id);
  }
}

import { Injectable } from '@nestjs/common';
import { AvailabilityScheduleService } from './availability-schedule.service';
import { SlotGenerationService } from './slot-generation.service';

type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

@Injectable()
export class DoctorAvailabilityService {
  constructor(
    private scheduleService: AvailabilityScheduleService,
    private slotService: SlotGenerationService,
  ) {}

  async getSchedules(doctorId: string, clinicId?: string) {
    return this.scheduleService.getSchedules(doctorId, clinicId);
  }

  async getSchedulesByClinic(clinicId: string) {
    return this.scheduleService.getSchedulesByClinic(clinicId);
  }

  async createSchedule(data: {
    doctorId: string;
    clinicId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDuration?: number;
    isActive?: boolean;
  }) {
    return this.scheduleService.createSchedule(data);
  }

  async updateSchedule(
    id: string,
    data: {
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      isActive?: boolean;
    },
    clinicId?: string,
  ) {
    return this.scheduleService.updateSchedule(id, data, clinicId);
  }

  async deleteSchedule(id: string, clinicId?: string) {
    return this.scheduleService.deleteSchedule(id, clinicId);
  }

  async bulkUpsertSchedules(
    doctorId: string,
    clinicId: string,
    schedules: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDuration?: number;
      isActive?: boolean;
    }>,
  ) {
    return this.scheduleService.bulkUpsertSchedules(
      doctorId,
      clinicId,
      schedules,
    );
  }

  async getTimeOffs(
    doctorId: string,
    options?: { clinicId?: string; upcoming?: boolean },
  ) {
    return this.scheduleService.getTimeOffs(doctorId, options);
  }

  async createTimeOff(data: {
    doctorId: string;
    clinicId?: string;
    startDate: Date | string;
    endDate: Date | string;
    reason?: string;
    isFullDay?: boolean;
    startTime?: string;
    endTime?: string;
  }) {
    return this.scheduleService.createTimeOff(data);
  }

  async deleteTimeOff(id: string, clinicId?: string) {
    return this.scheduleService.deleteTimeOff(id, clinicId);
  }

  async getAvailableSlots(
    clinicId: string,
    date: Date | string,
    doctorId?: string,
  ) {
    return this.slotService.getAvailableSlots(clinicId, date, doctorId);
  }
}

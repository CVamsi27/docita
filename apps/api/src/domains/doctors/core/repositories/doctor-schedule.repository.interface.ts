import { DoctorSchedule, DoctorTimeOff, Prisma } from '@workspace/db';

export interface IDoctorScheduleRepository {
  findSchedules(
    doctorId: string,
    clinicId?: string,
  ): Promise<
    Array<
      DoctorSchedule & {
        doctor: { id: string; name: string };
        clinic: { id: string; name: string };
      }
    >
  >;

  findSchedulesByClinic(clinicId: string): Promise<
    Array<
      DoctorSchedule & {
        doctor: { id: string; name: string; specialization: string | null };
      }
    >
  >;

  findScheduleByDoctorClinicDay(
    doctorId: string,
    clinicId: string,
    dayOfWeek: string,
  ): Promise<DoctorSchedule | null>;

  findSchedulesForSlotGeneration(
    where: Prisma.DoctorScheduleWhereInput,
  ): Promise<
    Array<
      DoctorSchedule & {
        doctor: { id: string; name: string; specialization: string | null };
      }
    >
  >;

  createSchedule(
    data: Prisma.DoctorScheduleCreateInput,
  ): Promise<DoctorSchedule & { doctor: { id: string; name: string } }>;

  updateSchedule(
    id: string,
    data: Prisma.DoctorScheduleUpdateInput,
  ): Promise<DoctorSchedule & { doctor: { id: string; name: string } }>;

  deleteSchedule(id: string): Promise<void>;

  deleteManySchedules(doctorId: string, clinicId: string): Promise<void>;

  createManySchedules(
    data: Prisma.DoctorScheduleCreateManyInput[],
  ): Promise<void>;

  findTimeOffs(where: Prisma.DoctorTimeOffWhereInput): Promise<
    Array<
      DoctorTimeOff & {
        doctor: { id: string; name: string };
        clinic: { id: string; name: string } | null;
      }
    >
  >;

  findTimeOffsForSlots(
    where: Prisma.DoctorTimeOffWhereInput,
  ): Promise<DoctorTimeOff[]>;

  findDoctorIdsWithFullDayTimeOffOverlappingRange(
    clinicId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<string[]>;

  createTimeOff(
    data: Prisma.DoctorTimeOffCreateInput,
  ): Promise<DoctorTimeOff & { doctor: { id: string; name: string } }>;

  findTimeOffById(id: string): Promise<DoctorTimeOff | null>;

  deleteTimeOff(id: string): Promise<void>;

  findScheduleById(id: string): Promise<DoctorSchedule | null>;
}

export const DOCTOR_SCHEDULE_REPOSITORY_TOKEN = Symbol(
  'IDoctorScheduleRepository',
);

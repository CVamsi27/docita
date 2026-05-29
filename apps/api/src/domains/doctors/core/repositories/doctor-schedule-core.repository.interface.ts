import { ClinicWeeklySchedule, DoctorSchedule, Prisma } from '@workspace/db';

export interface IDoctorScheduleCoreRepository {
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

  findClinicWeeklyForSlotGeneration(params: {
    clinicId: string;
    dayOfWeek: string;
  }): Promise<ClinicWeeklySchedule[]>;

  /** True when the clinic has at least one persisted clinic weekly row (any day). */
  hasAnyClinicWeeklySchedule(clinicId: string): Promise<boolean>;

  createSchedule(
    data: Prisma.DoctorScheduleCreateInput,
  ): Promise<DoctorSchedule & { doctor: { id: string; name: string } }>;

  updateSchedule(
    id: string,
    data: Prisma.DoctorScheduleUpdateInput,
  ): Promise<DoctorSchedule & { doctor: { id: string; name: string } }>;

  findScheduleById(id: string): Promise<DoctorSchedule | null>;

  deleteSchedule(id: string): Promise<void>;

  deleteManySchedules(doctorId: string, clinicId: string): Promise<void>;

  createManySchedules(
    data: Prisma.DoctorScheduleCreateManyInput[],
  ): Promise<void>;

  findClinicTimezone(clinicId: string): Promise<string | null>;
}

export const DOCTOR_SCHEDULE_CORE_REPOSITORY_TOKEN = Symbol(
  'IDoctorScheduleCoreRepository',
);

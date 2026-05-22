import { DoctorTimeOff, Prisma } from '@workspace/db';

export interface IDoctorTimeOffRepository {
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
}

export const DOCTOR_TIME_OFF_REPOSITORY_TOKEN = Symbol(
  'IDoctorTimeOffRepository',
);

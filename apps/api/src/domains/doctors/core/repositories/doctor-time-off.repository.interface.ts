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
    tx?: Prisma.TransactionClient,
  ): Promise<DoctorTimeOff & { doctor: { id: string; name: string } }>;

  findTimeOffById(id: string): Promise<DoctorTimeOff | null>;

  updateTimeOff(
    id: string,
    data: Prisma.DoctorTimeOffUpdateInput,
    expectedVersion?: number,
    tx?: Prisma.TransactionClient,
  ): Promise<DoctorTimeOff>;

  deleteTimeOff(id: string, tx?: Prisma.TransactionClient): Promise<void>;
}

export const DOCTOR_TIME_OFF_REPOSITORY_TOKEN = Symbol(
  'IDoctorTimeOffRepository',
);

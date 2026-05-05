import { QueueToken, Prisma } from '@workspace/db';

export type QueueTokenWithRelations = QueueToken & {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    gender?: string | null;
    dateOfBirth?: Date | null;
  };
  doctor: { id: string; name: string } | null;
  appointment: {
    id: string;
    type: string;
    chiefComplaint: string | null;
    doctor: { id: string; name: string } | null;
  } | null;
};

export type AppointmentForCheckIn = {
  id: string;
  patientId: string;
  doctorId: string | null;
  startTime: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
};

export interface IQueueRepository {
  findTodayTokens(
    clinicId: string,
    fromDate: Date,
    toDate: Date,
    doctorId?: string,
    statusIn?: string[],
    search?: string,
  ): Promise<QueueTokenWithRelations[]>;

  findAppointmentForCheckIn(
    appointmentId: string,
    clinicId: string,
  ): Promise<AppointmentForCheckIn | null>;

  findExistingToken(
    appointmentId: string,
    clinicId: string,
  ): Promise<QueueToken | null>;

  findLastTodayTokenNumber(clinicId: string, fromDate: Date): Promise<number>;

  createToken(data: Prisma.QueueTokenUncheckedCreateInput): Promise<QueueToken>;

  findTokenByIdAndClinic(
    id: string,
    clinicId: string,
  ): Promise<QueueToken | null>;

  updateToken(
    id: string,
    data: Prisma.QueueTokenUpdateInput,
  ): Promise<QueueToken>;

  cancelTodayActiveTokens(clinicId: string, fromDate: Date): Promise<void>;
}

export const QUEUE_REPOSITORY_TOKEN = Symbol('IQueueRepository');

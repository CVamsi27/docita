import { QueueToken, Prisma, QueueTokenStatus } from '@workspace/db';

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

/**
 * Input for atomic allocation. `tokenNumber` and `tokenDay` are assigned by
 * the repository inside the advisory-locked transaction, so callers must not
 * supply them.
 */
export type QueueTokenAllocationInput = Omit<
  Prisma.QueueTokenUncheckedCreateInput,
  'tokenNumber' | 'tokenDay'
>;

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

  /**
   * Atomically allocates the next token number for a clinic/day and inserts
   * the token. Concurrent allocations cannot observe the same maximum, so
   * token identities stay unique without relying on the caller serializing.
   */
  allocateToken(
    data: QueueTokenAllocationInput,
    fromDate: Date,
  ): Promise<QueueToken>;

  findTokenByIdAndClinic(
    id: string,
    clinicId: string,
  ): Promise<QueueToken | null>;

  /**
   * Status-conditional token transition. The update applies only while the
   * token still holds one of `expectedStatuses`, so a stale caller cannot
   * reopen a finished (or cancelled) entry. Resolves null when the token
   * moved on; the caller decides whether that is a conflict or a no-op.
   */
  transitionTokenStatus(
    id: string,
    expectedStatuses: QueueTokenStatus[],
    data: Prisma.QueueTokenUpdateManyMutationInput,
  ): Promise<QueueToken | null>;

  cancelTodayActiveTokens(clinicId: string, fromDate: Date): Promise<void>;
}

export const QUEUE_REPOSITORY_TOKEN = Symbol('IQueueRepository');

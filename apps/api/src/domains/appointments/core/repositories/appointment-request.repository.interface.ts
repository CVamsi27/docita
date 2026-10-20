import {
  AppointmentRequest,
  AppointmentRequestStatus,
  Prisma,
} from '@workspace/db';

export type AppointmentRequestWithRelations = AppointmentRequest & {
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  } | null;
  preferredDoctor?: { id: string; name: string | null } | null;
  reviewedBy?: { id: string; name: string | null } | null;
};

export interface AppointmentRequestListFilters {
  clinicId: string;
  patientId?: string;
  status?: AppointmentRequestStatus;
  from?: Date;
  to?: Date;
  take: number;
  skip: number;
}

export interface AppointmentRequestMatchingAppointmentInput {
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  reason: string;
  requestCreatedAt: Date;
}

export interface IAppointmentRequestRepository {
  create(
    data: Prisma.AppointmentRequestUncheckedCreateInput,
  ): Promise<AppointmentRequestWithRelations>;
  findForClinic(
    filters: AppointmentRequestListFilters,
  ): Promise<{ items: AppointmentRequestWithRelations[]; total: number }>;
  findByIdAndClinic(
    id: string,
    clinicId: string,
  ): Promise<AppointmentRequestWithRelations | null>;
  /**
   * The PENDING request holding a slot identity, if any. Used to return the
   * original request when a retried or concurrent public submission loses the
   * unique index race.
   */
  findPendingBySlotKey(
    pendingSlotKey: string,
  ): Promise<AppointmentRequestWithRelations | null>;
  update(
    id: string,
    clinicId: string,
    data: Prisma.AppointmentRequestUpdateInput,
  ): Promise<AppointmentRequestWithRelations>;
  markReviewed(input: {
    id: string;
    clinicId: string;
    status: AppointmentRequestStatus;
    reviewedById: string;
    responseMessage: string;
    /** Optimistic-concurrency guard: transition only applies when the current
     *  status still matches; the call resolves null when it did not. */
    expectedStatus?: AppointmentRequestStatus;
  }): Promise<AppointmentRequestWithRelations | null>;
  findMatchingAppointment(
    input: AppointmentRequestMatchingAppointmentInput,
  ): Promise<{ id: string } | null>;
  doctorBelongsToClinic(doctorId: string, clinicId: string): Promise<boolean>;
}

export const APPOINTMENT_REQUEST_REPOSITORY_TOKEN = Symbol(
  'IAppointmentRequestRepository',
);

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
  update(
    id: string,
    data: Prisma.AppointmentRequestUpdateInput,
  ): Promise<AppointmentRequestWithRelations>;
  doctorBelongsToClinic(doctorId: string, clinicId: string): Promise<boolean>;
}

export const APPOINTMENT_REQUEST_REPOSITORY_TOKEN = Symbol(
  'IAppointmentRequestRepository',
);

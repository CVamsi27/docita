// jscpd:ignore-start
export interface IPortalAppointmentsRepository {
  getUpcomingAppointments(
    patientId: string,
    clinicId: string,
    from: Date,
    take: number,
  ): Promise<unknown[]>;

  getAppointments(
    patientId: string,
    clinicId: string,
    filters: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      take: number;
      skip: number;
    },
  ): Promise<{ items: unknown[]; total: number }>;
  // jscpd:ignore-end

  getAppointmentById(
    appointmentId: string,
    patientId: string,
    clinicId: string,
  ): Promise<unknown | null>;
}

export const PORTAL_APPOINTMENTS_REPOSITORY_TOKEN = Symbol(
  'IPortalAppointmentsRepository',
);

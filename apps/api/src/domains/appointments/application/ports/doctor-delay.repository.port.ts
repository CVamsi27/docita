export interface DoctorDelayRecord {
  id: string;
  clinicId: string;
  doctorId: string;
  delayMinutes: number;
  reason?: string | null;
  isActive: boolean;
  markedById: string;
  markedAt: Date;
  clearedAt?: Date | null;
  clearedById?: string | null;
}

export interface UpcomingAppointmentShiftRow {
  id: string;
  startTime: Date;
  endTime: Date;
  originalStartTime: Date | null;
}

export interface MarkDoctorDelayPersistenceCommand {
  clinicId: string;
  doctorId: string;
  delayMinutes: number;
  reason?: string;
  markedById: string;
}

export interface IDoctorDelayRepository {
  markDelayAndShiftAppointments(
    command: MarkDoctorDelayPersistenceCommand,
  ): Promise<{ delay: DoctorDelayRecord; affectedAppointmentIds: string[] }>;

  findById(delayId: string): Promise<DoctorDelayRecord | null>;

  clearDelay(
    delayId: string,
    clinicId: string,
    clearedById: string,
  ): Promise<void>;

  findActiveByDoctor(
    doctorId: string,
    clinicId: string,
  ): Promise<DoctorDelayRecord | null>;

  findActiveByClinic(clinicId: string): Promise<DoctorDelayRecord[]>;
}

export const DOCTOR_DELAY_REPOSITORY_TOKEN = 'IDoctorDelayRepository';

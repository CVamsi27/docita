import { Appointment, Prisma, AppointmentStatus } from '@workspace/db';

export interface AppointmentSearchParams {
  clinicId: string;
  date?: string;
  startDate?: Date;
  endDate?: Date;
  patientId?: string;
  doctorId?: string;
  userId?: string; // For role-based filtering
  userRole?: string;
  status?: AppointmentStatus[];
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export interface IAppointmentRepository {
  /**
   * Find all appointments with complex filtering and pagination
   */
  findAll(
    params: AppointmentSearchParams,
  ): Promise<PaginatedResult<Appointment>>;

  /**
   * Find a single appointment by ID with all relations
   */
  findById(id: string): Promise<Appointment | null>;

  /**
   * Create a new appointment
   */
  create(data: Prisma.AppointmentCreateInput): Promise<Appointment>;

  /**
   * Update an existing appointment
   */
  update(id: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment>;

  /**
   * Delete an appointment
   */
  delete(id: string): Promise<void>;

  /**
   * Check for overlapping appointments for a doctor
   */
  findOverlapping(
    doctorId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<Appointment[]>;
}

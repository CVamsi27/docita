import type { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type { DentalChartData } from '@workspace/types';

export interface AppointmentListItem {
  id?: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  notes?: string;
  consultationNotes?: string;
  observations?: string;
  chiefComplaint?: string;
  dentalChart?: DentalChartData;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  } | null;
  doctor?: {
    id: string;
    name: string;
  } | null;
}

export interface AppointmentSearchParams {
  clinicId: string;
  startDate?: Date;
  endDate?: Date;
  /**
   * When true with both dates set, match appointments whose interval intersects
   * `[startDate, endDate)` (end exclusive). Used for clinic-local calendar days.
   */
  intersectCalendarRange?: boolean;
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatusEnum[];
  search?: string;
  cursor?: string;
  page?: number;
// jscpd:ignore-start
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

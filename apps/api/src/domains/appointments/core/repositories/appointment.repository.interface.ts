import type { IAppointmentReadRepository } from './appointment-read.repository.interface';
import type { IAppointmentWriteRepository } from './appointment-write.repository.interface';

export type {
  AppointmentListItem,
  AppointmentSearchParams,
  PaginatedResult,
} from './appointment-repository.types';
export type { IAppointmentReadRepository } from './appointment-read.repository.interface';
export {
  APPOINTMENT_READ_REPOSITORY_TOKEN,
} from './appointment-read.repository.interface';
export type { IAppointmentWriteRepository } from './appointment-write.repository.interface';
export {
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
} from './appointment-write.repository.interface';

/** Composite port; prefer read/write tokens in command vs query services. */
export interface IAppointmentRepository
  extends IAppointmentReadRepository,
    IAppointmentWriteRepository {}

export const APPOINTMENT_REPOSITORY_TOKEN = Symbol('IAppointmentRepository');

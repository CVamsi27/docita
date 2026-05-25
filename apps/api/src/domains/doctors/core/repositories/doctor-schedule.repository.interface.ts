import type { IDoctorScheduleCoreRepository } from './doctor-schedule-core.repository.interface';
import type { IDoctorTimeOffRepository } from './doctor-time-off.repository.interface';

export { DOCTOR_SCHEDULE_CORE_REPOSITORY_TOKEN } from './doctor-schedule-core.repository.interface';
export { DOCTOR_TIME_OFF_REPOSITORY_TOKEN } from './doctor-time-off.repository.interface';

/** Composite port for schedule CRUD and time-off management. */
export interface IDoctorScheduleRepository
  extends IDoctorScheduleCoreRepository, IDoctorTimeOffRepository {}

export const DOCTOR_SCHEDULE_REPOSITORY_TOKEN = Symbol(
  'IDoctorScheduleRepository',
);

import type { IClinicCoreRepository } from './clinic-core.repository.interface';
import type { IClinicMembershipRepository } from './clinic-membership.repository.interface';

export type {
  CreateClinicInput,
  UpdateClinicInput,
  ClinicStats,
  ClinicLookup,
  ClinicSearchResult,
  ClinicListItem,
  ClinicDetailsItem,
  DoctorClinicItem,
} from './clinic-repository.types';
export type { UserForClinicJoin } from './clinic-membership.repository.interface';
export type { IClinicCoreRepository } from './clinic-core.repository.interface';
export { CLINIC_CORE_REPOSITORY_TOKEN } from './clinic-core.repository.interface';
export type { IClinicMembershipRepository } from './clinic-membership.repository.interface';
export {
  CLINIC_MEMBERSHIP_REPOSITORY_TOKEN,
} from './clinic-membership.repository.interface';

/** Composite port; clinic settings are updated via `IClinicCoreRepository.update`. */
export interface IClinicDataRepository
  extends IClinicCoreRepository,
    IClinicMembershipRepository {}

export const CLINIC_DATA_REPOSITORY_TOKEN = Symbol('IClinicDataRepository');

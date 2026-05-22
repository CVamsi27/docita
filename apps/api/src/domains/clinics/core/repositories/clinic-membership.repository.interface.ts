import { Role } from '@workspace/db';

export interface UserForClinicJoin {
  id: string;
  role: Role;
  clinicId: string | null;
}

export interface IClinicMembershipRepository {
  findUserForJoin(userId: string): Promise<UserForClinicJoin | null>;
  joinClinic(userId: string, clinicId: string, userRole: Role): Promise<void>;
}

export const CLINIC_MEMBERSHIP_REPOSITORY_TOKEN = Symbol(
  'IClinicMembershipRepository',
);

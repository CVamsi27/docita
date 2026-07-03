import { GuidedTourStatus, OnboardingStep, User } from '@workspace/db';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  sidebarNavOrderOverride?: unknown;
}

export interface JwtValidationUserSnapshot {
  id: string;
  name: string;
  clinicId: string | null;
  emailVerified: boolean;
  onboardingStep: OnboardingStep | null;
  appLoginDisabled: boolean;
}

export interface GuidedTourStateRecord {
  status: GuidedTourStatus;
  lastStep: number;
  completedAt: Date | null;
  checklistDismissedAt: Date | null;
}

export interface GuidedTourUpdate {
  status?: GuidedTourStatus;
  lastStep?: number;
  completedAt?: Date | null;
  checklistDismissedAt?: Date | null;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByIdForJwtValidation(
    id: string,
  ): Promise<JwtValidationUserSnapshot | null>;
  findByEmail(email: string): Promise<User | null>;
  getProfile(userId: string): Promise<UserProfile | null>;
  updateProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      sidebarNavOrderOverride?: unknown | null;
    },
  ): Promise<UserProfile>;
  updateOnboardingStep(userId: string, step: string): Promise<void>;
  getGuidedTour(userId: string): Promise<GuidedTourStateRecord | null>;
  updateGuidedTour(
    userId: string,
    patch: GuidedTourUpdate,
  ): Promise<GuidedTourStateRecord>;
  findPasswordExpiresAt(userId: string): Promise<Date | null>;
  /**
   * DPDP "right to erasure" for a staff account: soft-deletes the user, disables
   * app login immediately, and records a tracked DataSubjectRequest (DELETION)
   * for the clinic so the request is auditable and shows in the compliance queue.
   * The retention sweep anonymizes the row after the obligation window.
   */
  recordAccountDeletionRequest(
    userId: string,
  ): Promise<{ requestId: string | null; requestedAt: Date }>;
}

export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');

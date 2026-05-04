import { OnboardingStep, User } from '@workspace/db';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtValidationUserSnapshot {
  id: string;
  name: string;
  clinicId: string | null;
  emailVerified: boolean;
  onboardingStep: OnboardingStep | null;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByIdForJwtValidation(
    id: string,
  ): Promise<JwtValidationUserSnapshot | null>;
  findByEmail(email: string): Promise<User | null>;
  updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ): Promise<UserProfile>;
  updateOnboardingStep(userId: string, step: string): Promise<void>;
}

export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');

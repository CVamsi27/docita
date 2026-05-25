import { OnboardingStep, Role } from '@workspace/db';

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  role: Role;
  clinicId: string | null;
  emailVerified?: boolean;
  onboardingStep?: OnboardingStep | null;
  createdAt: Date;
  updatedAt: Date;
  mfaEnabled?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: Role;
  clinicId?: string;
  clinicName?: string;
}

export interface ChangePasswordData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface AuthDeviceInfo {
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthLoginResult {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    clinicId: string | null;
    emailVerified?: boolean;
    onboardingStep?: OnboardingStep;
  };
}

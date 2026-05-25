import { User } from '@workspace/db';
import type { OtpRecord } from './portal-patient.types';

export interface IPortalAuthRepository {
  invalidateOtps(phone: string): Promise<void>;

  createOtp(data: {
    phoneNumber: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<OtpRecord>;

  findActiveOtp(phone: string, now: Date): Promise<OtpRecord | null>;

  incrementOtpAttempts(id: string): Promise<void>;

  markOtpUsed(id: string): Promise<void>;

  createPortalUser(data: {
    email: string;
    password: string;
    role: User['role'];
    name: string;
  }): Promise<User>;
}

export const PORTAL_AUTH_REPOSITORY_TOKEN = Symbol('IPortalAuthRepository');

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

  /**
   * Atomically increments the OTP attempts counter for the given record
   * but only if the current `attempts` is below `maxAttempts`. Returns
   * `true` when the counter was incremented (caller may proceed to
   * validate the OTP), `false` when the row was already at the cap
   * (caller MUST treat this as a rate-limit / brute-force signal).
   *
   * Implemented as a single conditional UPDATE so concurrent verify
   * calls cannot race past the cap — without this, the read-then-check
   * pattern in the service layer would let an attacker fan out
   * thousands of parallel requests and bypass the 3-attempt limit
   * (the previous read-then-increment implementation was vulnerable
   * to exactly this — see the comment on the Prisma implementation).
   */
  tryConsumeOtpAttempt(id: string, maxAttempts: number): Promise<boolean>;

  /**
   * Atomically claims the single-use OTP by setting `usedAt` only while it
   * is still null. Returns `true` for the caller that wins the claim (it may
   * issue a session) and `false` for a concurrent caller that lost a race
   * despite presenting the same valid code. A read-then-write "mark used"
   * would let two parallel verifies both pass bcrypt.compare and both mint
   * sessions from one OTP.
   */
  tryMarkOtpUsed(id: string): Promise<boolean>;

  createPortalUser(data: {
    email: string;
    password: string;
    role: User['role'];
    name: string;
  }): Promise<User>;
}

export const PORTAL_AUTH_REPOSITORY_TOKEN = Symbol('IPortalAuthRepository');

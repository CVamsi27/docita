import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { normalizeReferrerCodeInput } from '@/domains/subscriptions/core/services/referral-code.rules';

/**
 * Resolves a referral code to either a `Referrer` (partner) or a `Clinic`.
 * Both naming schemes coexist in production — clinics use the legacy short
 * code (e.g. `DRSHARMA`); partners use the new `RFR-XXXXXX` format.
 *
 * Pure: no decorators that escape DI scope, no side effects beyond the
 * underlying Prisma query.
 */
export interface ResolvedReferralCode {
  kind: 'PARTNER' | 'CLINIC' | 'NONE';
  referrerId?: string;
  clinicId?: string;
}

@Injectable()
export class ReferralCodeResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a user-entered code. Returns the type and the resolved id.
   * - If the code matches a `Referrer.code`, returns `kind: 'PARTNER'`.
   * - Else if it matches a `Clinic.referralCode`, returns `kind: 'CLINIC'`.
   * - Else returns `kind: 'NONE'` (caller decides the user-facing error).
   *
   * Format is normalized (trim + upper-case) but a `RFR-` prefix is not
   * required — we resolve by exact match, not by prefix.
   */
  async resolveCode(rawCode: string): Promise<ResolvedReferralCode> {
    const code = normalizeReferrerCodeInput(rawCode);
    if (!code) return { kind: 'NONE' };

    const partner = await this.prisma.referrer.findUnique({
      where: { code },
      select: { id: true, active: true },
    });
    if (partner && partner.active) {
      return { kind: 'PARTNER', referrerId: partner.id };
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (clinic) {
      return { kind: 'CLINIC', clinicId: clinic.id };
    }

    return { kind: 'NONE' };
  }
}

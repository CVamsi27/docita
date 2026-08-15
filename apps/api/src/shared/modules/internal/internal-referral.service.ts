import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { z } from 'zod';
import { Prisma, ReferralPayoutStatus } from '@workspace/db';
import { normalizePhoneE164, phoneMatchCandidates } from '@workspace/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  defaultRateBandsForType,
  rateBandsSchema,
} from '@/domains/subscriptions/core/services/referral-reward.rules';
import {
  generateReferrerCode,
  isValidReferrerCode,
} from '@/domains/subscriptions/core/services/referral-code.rules';
import { ReferrerWelcomeService } from '@/domains/subscriptions/core/services/referrer-welcome.service';

export const createReferrerSchema = z.object({
  type: z.enum(['CLINIC', 'PHARMACY', 'MARKETING_PERSON', 'CUSTOM']),
  rewardKind: z.enum(['CREDIT_MONTHS', 'REVENUE_SHARE']).optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(40).optional(),
  clinicId: z.string().max(64).optional(),
  rateBands: rateBandsSchema.optional(),
  payoutDetails: z.record(z.string(), z.unknown()).optional(),
  firstYearOnly: z.boolean().optional(),
});
type CreateReferrerInput = z.infer<typeof createReferrerSchema>;

/** Maximum attempts to claim a fresh referrer code. The alphabet is
 *  32^6 ≈ 1.07B; collisions at realistic scale are vanishingly rare. */
const MAX_CODE_GENERATION_ATTEMPTS = 8;

/**
 * Internal (Docita operator) administration of referral partners and the
 * revenue-share payout ledger. All routes are INTERNAL-guarded at the
 * controller. Payouts are disbursed manually — `markPayoutPaid` only records
 * that the operator has paid a ledger row.
 */
@Injectable()
export class InternalReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly welcomeService: ReferrerWelcomeService,
  ) {}

  /**
   * Create a referral partner. A short, human-shareable code
   * (`RFR-XXXXXX`) is generated on create (retry-on-collision) and the
   * `REFERRER_CREATED` event is fired after commit so the welcome
   * pipeline can render the showcase PDF and send the WABA template.
   *
   * The event fires AFTER the row is in the DB; the welcome service
   * handles its own failure path (sets `welcomeError` on the row).
   */
  async createReferrer(input: CreateReferrerInput) {
    const { type } = input;
    const rewardKind =
      input.rewardKind ??
      (type === 'CLINIC' ? 'CREDIT_MONTHS' : 'REVENUE_SHARE');

    const bands =
      input.rateBands ??
      (rewardKind === 'REVENUE_SHARE'
        ? [...defaultRateBandsForType(type)]
        : undefined);

    // Idempotent on normalized phone: refuse to create a second partner for a
    // number that already exists in any stored form, so an operator who hits
    // Create twice (or a partner who self-signs up twice) gets a surfaced
    // conflict instead of a silent duplicate. Deactivated partners keep their
    // row (financial history), so the conflict covers all rows, not just
    // active ones.
    let phone: string | null = null;
    if (input.phone) {
      phone = normalizePhoneE164(input.phone);
      const existing = await this.prisma.referrer.findFirst({
        where: { phone: { in: phoneMatchCandidates(phone) } },
        select: { id: true },
      });
      if (existing) {
        // The wire contract is the AllExceptionsFilter problem-details
        // envelope (detail + optional code); extra fields do not reach the
        // client. DUPLICATE_ENTRY is the canonical AppErrorCode for
        // "already exists" and lets the UI distinguish this from other 409s.
        throw new ConflictException({
          message: 'A partner with this phone number already exists',
          code: 'DUPLICATE_ENTRY',
        });
      }
    }

    const referrer = await this.createWithUniqueCode({
      type: input.type,
      rewardKind,
      name: input.name,
      email: input.email ?? null,
      phone,
      clinicId: input.clinicId ?? null,
      rateBands: bands ? toPrismaInputJsonValue(bands) : Prisma.JsonNull,
      payoutDetails: input.payoutDetails
        ? toPrismaInputJsonValue(input.payoutDetails)
        : Prisma.JsonNull,
      firstYearOnly: input.firstYearOnly ?? true,
    });

    // Fire after commit so the welcome service always sees a persisted row.
    this.eventEmitter.emit(ApplicationEvents.REFERRER_CREATED, {
      referrerId: referrer.id,
    });

    return referrer;
  }

  private async createWithUniqueCode(
    data: Prisma.ReferrerUncheckedCreateInput,
  ) {
    let lastError: unknown;
    for (
      let attempt = 0;
      attempt < MAX_CODE_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const code = generateReferrerCode();
      if (!isValidReferrerCode(code)) {
        throw new Error(
          `Generated referrer code is invalid: ${code} (attempt ${attempt + 1})`,
        );
      }
      try {
        return await this.prisma.referrer.create({
          data: { ...data, code },
        });
      } catch (error) {
        if (isUniqueConstraintOnCode(error)) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw new Error(
      `Unable to generate a unique referrer code after ${MAX_CODE_GENERATION_ATTEMPTS} attempts (last error: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      })`,
    );
  }

  /** Operator-triggered resend of the partner welcome message. */
  async resendWelcome(referrerId: string) {
    const referrer = await this.prisma.referrer.findUnique({
      where: { id: referrerId },
      select: { id: true },
    });
    if (!referrer) {
      throw new NotFoundException('Referrer not found');
    }
    await this.welcomeService.resendWelcome(referrerId);
    return { ok: true };
  }

  /**
   * Operator-facing list view. Includes the new self-service fields
   * (code, welcome status, payout-details completeness) so the
   * internal page can render the "Resend welcome" / "Payout details
   * not set" actions without an extra round-trip per row.
   */
  async listReferrers() {
    return this.prisma.referrer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        payoutDetail: {
          select: { verified: true, updatedAt: true },
        },
      },
    });
  }

  /** Per-referrer message audit log for the operator drawer. */
  async listMessages(referrerId: string) {
    return this.prisma.referrerMessage.findMany({
      where: { referrerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async listPayouts(filter?: {
    status?: ReferralPayoutStatus;
    referrerId?: string;
  }) {
    return this.prisma.referralPayout.findMany({
      where: {
        status: filter?.status,
        referrerId: filter?.referrerId,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async markPayoutPaid(payoutId: string) {
    // Only an unpaid, non-void row can be marked paid.
    const updated = await this.prisma.referralPayout.updateMany({
      where: {
        id: payoutId,
        status: {
          in: [ReferralPayoutStatus.PENDING, ReferralPayoutStatus.APPROVED],
        },
      },
      data: { status: ReferralPayoutStatus.PAID, paidAt: new Date() },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Payout not found or not in a payable state');
    }
    return this.prisma.referralPayout.findUnique({ where: { id: payoutId } });
  }

  /** Totals by status for the operator payout dashboard. */
  async payoutSummary() {
    const grouped = await this.prisma.referralPayout.groupBy({
      by: ['status'],
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    return grouped.map((row) => ({
      status: row.status,
      count: row._count._all,
      totalCents: row._sum.amountCents ?? 0,
    }));
  }
}

function isUniqueConstraintOnCode(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) && target.includes('code');
}

// ReferrerMessageStatus is imported for use in this service's referrer
// message rows but is not re-exported — callers (e.g. the operator
// controller) import the enum directly from `@workspace/db`. The
// previous re-export was dead code (knip flagged it).

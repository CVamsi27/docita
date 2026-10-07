import { randomUUID } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { type Prisma, UsageType } from '@workspace/db';
import {
  getAiCreditAllotment,
  isAiCreditEnforced,
  isAiCreditExhausted,
  isAnyAiCreditTierEnforced,
} from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { withBlockingAdvisoryLock } from '@/shared/common/utils/postgres-advisory-lock';

/**
 * Handle for one admitted (reserved) AI call. `undefined` means the call was
 * allowed without a reservation (missing clinic, unenforced tier, or the
 * fail-open fallback) — `releaseAdmission` treats it as a no-op.
 */
type AiCreditAdmission = { ticketId: string; clinicId: string };

/** UsageEvent.entityType marking a zero-quantity in-flight claim. */
const ADMISSION_ENTITY_TYPE = 'AiCreditAdmission';
/**
 * A claim from a request that crashed before releasing stops gating other
 * calls after this long (it is reaped inside the admission lock).
 */
const ADMISSION_TTL_MS = 30 * 60 * 1000;

/**
 * Pre-call AI-credit gate. Blocks a billable AI op only when the clinic's tier
 * has a finite allotment configured (`AI_CREDIT_ALLOTMENT_BY_TIER`) AND the
 * clinic has exhausted it this calendar-month period.
 *
 * Admission is atomic: the check runs under a per-clinic advisory lock and
 * admits by writing a zero-quantity claim row, so with one credit left only
 * one of N parallel callers wins ("parallel last-unit consumption has one
 * winner"). The claim is not a charge — callers release it when the AI call
 * settles (`releaseAdmission`), and the real usage event is recorded
 * separately on success as before.
 *
 * Fail-open by design:
 * - While no tier is priced (the default) it returns immediately, touching no
 *   DB — so this ships fully inert until product sets numbers.
 * - Any lookup error allows the call (a metering bug must never block care).
 * Only a genuine over-allotment raises HTTP 402.
 */
@Injectable()
export class AiCreditGuardService {
  private readonly logger = new Logger(AiCreditGuardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async assertWithinAllotment(
    clinicId: string | null | undefined,
  ): Promise<AiCreditAdmission | undefined> {
    if (!clinicId) return undefined;
    // Global fast path: nothing priced yet → enforcement off for every tier.
    if (!isAnyAiCreditTierEnforced()) return undefined;

    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { tier: true },
      });
      // ClinicTier (db) values are a subset of TierName, so no cast needed.
      const tier = clinic?.tier;
      if (!tier || !isAiCreditEnforced(tier)) return undefined;

      const allotment = getAiCreditAllotment(tier);
      const now = this.clock.now();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const staleBefore = new Date(now.getTime() - ADMISSION_TTL_MS);
      const lockName = `ai-credit-admission:${clinicId}:${periodStart.toISOString()}`;

      return await withBlockingAdvisoryLock(
        this.prisma,
        lockName,
        async (tx) => {
          // Self-heal claims left behind by crashed requests so they cannot
          // gate the clinic until the next period rollover.
          await tx.usageEvent.deleteMany({
            where: {
              clinicId,
              type: UsageType.AI_CREDITS,
              entityType: ADMISSION_ENTITY_TYPE,
              timestamp: { lt: staleBefore },
            },
          });

          const used = await this.periodAiCredits(tx, clinicId, periodStart);
          const inflight = await tx.usageEvent.count({
            where: {
              clinicId,
              type: UsageType.AI_CREDITS,
              entityType: ADMISSION_ENTITY_TYPE,
              timestamp: { gte: periodStart },
            },
          });
          if (isAiCreditExhausted(allotment, used + inflight)) {
            throw new HttpException(
              'AI credit allotment reached for this billing period',
              HttpStatus.PAYMENT_REQUIRED,
            );
          }

          const claim = await tx.usageEvent.create({
            data: {
              clinicId,
              type: UsageType.AI_CREDITS,
              quantity: 0,
              entityType: ADMISSION_ENTITY_TYPE,
              eventKey: `ai-admission:${randomUUID()}`,
              metadata: { admission: true },
              timestamp: now,
            },
          });
          return { ticketId: claim.id, clinicId };
        },
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(
        `AI credit admission failed (allowing the call): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return undefined;
    }
  }

  /**
   * Release an in-flight claim once the AI call settles. Idempotent and
   * fail-open: a failed release only leaves the zero-quantity claim to the
   * TTL reaper, so it must never mask the original error.
   */
  async releaseAdmission(
    admission: AiCreditAdmission | null | undefined,
  ): Promise<void> {
    if (!admission) return;
    try {
      await this.prisma.usageEvent.deleteMany({
        where: {
          id: admission.ticketId,
          entityType: ADMISSION_ENTITY_TYPE,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to release AI credit admission (expires by TTL): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async periodAiCredits(
    tx: Prisma.TransactionClient,
    clinicId: string,
    periodStart: Date,
  ): Promise<number> {
    const result = await tx.usageEvent.aggregate({
      where: {
        clinicId,
        type: UsageType.AI_CREDITS,
        timestamp: { gte: periodStart },
      },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }
}

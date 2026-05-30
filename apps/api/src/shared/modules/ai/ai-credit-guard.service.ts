import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UsageType } from '@workspace/db';
import {
  getAiCreditAllotment,
  isAiCreditEnforced,
  isAiCreditExhausted,
  isAnyAiCreditTierEnforced,
  type TierName,
} from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Pre-call AI-credit gate. Blocks a billable AI op only when the clinic's tier
 * has a finite allotment configured (`AI_CREDIT_ALLOTMENT_BY_TIER`) AND the
 * clinic has exhausted it this calendar-month period.
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
  ): Promise<void> {
    if (!clinicId) return;
    // Global fast path: nothing priced yet → enforcement off for every tier.
    if (!isAnyAiCreditTierEnforced()) return;

    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { tier: true },
      });
      const tier = clinic?.tier as TierName | undefined;
      if (!tier || !isAiCreditEnforced(tier)) return;

      const used = await this.currentPeriodAiCredits(clinicId);
      if (isAiCreditExhausted(getAiCreditAllotment(tier), used)) {
        throw new HttpException(
          'AI credit allotment reached for this billing period',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(
        `AI credit gate lookup failed (allowing the call): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async currentPeriodAiCredits(clinicId: string): Promise<number> {
    const now = this.clock.now();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await this.prisma.usageEvent.aggregate({
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

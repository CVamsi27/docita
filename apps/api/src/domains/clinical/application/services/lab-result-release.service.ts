import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import type { LabWorkflowRepository } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import {
  LAB_RESULT_CLAIM_LEASE_MS,
  MAX_RESULT_NOTIFICATION_ATTEMPTS,
  LabResultNotificationService,
} from './lab-result-notification.service';

/** Orders one retry sweep handles. */
const RESULT_NOTIFICATION_RETRY_BATCH = 50;

interface ReleaseResultInput {
  orderId: string;
  clinicId: string;
  releasedBy: string;
}

export type ReleaseOutcome =
  | 'RELEASED_AND_NOTIFIED'
  | 'RELEASED_NOTIFICATION_PENDING'
  | 'ALREADY_RELEASED';

/**
 * Lab result release: one atomic authorization, one durable notification.
 *
 * Release used to be check-then-act — read the order, check it was not
 * COMPLETED, message the patient, then write COMPLETED with no status predicate.
 * Two reachable callers (the release endpoint and the auto-release that fires
 * from uploadResult/verifyPayment) could both pass the check, so a clinician
 * releasing while a payment verification completed notified the patient twice.
 *
 * The order is now claimed with a fencing token before anything is sent, so
 * exactly one caller ever notifies; the message itself is delivered by
 * {@link LabResultNotificationService}, which records its own outcome.
 */
@Injectable()
export class LabResultReleaseService {
  private readonly logger = new Logger(LabResultReleaseService.name);

  constructor(
    @Inject('LabWorkflowRepository')
    private readonly workflowRepository: LabWorkflowRepository,
    private readonly notifications: LabResultNotificationService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Releases the result and notifies the patient, at most once per order.
   *
   * `ALREADY_RELEASED` is returned rather than thrown for the manual endpoint so
   * a double-clicked Release button is a no-op rather than an error; a caller
   * racing a *live* release gets the same answer, because only the claim winner
   * can have sent anything.
   */
  async releaseResult(input: ReleaseResultInput): Promise<ReleaseOutcome> {
    const { orderId, clinicId } = input;
    const now = this.clock.now();

    const claimed = await this.workflowRepository.claimRelease({
      id: orderId,
      clinicId,
      claimToken: randomUUID(),
      now,
      releasedBy: input.releasedBy,
    });

    if (!claimed) {
      const existing = await this.workflowRepository.findReleaseContext(
        orderId,
        clinicId,
      );
      // A missing order still means the caller addressed something real; keep
      // the previous 404 semantics rather than swallowing it as "already".
      if (!existing) throw new NotFoundException('Lab order not found');
      return 'ALREADY_RELEASED';
    }

    const notified = await this.notifications.deliver(orderId, clinicId);
    return notified ? 'RELEASED_AND_NOTIFIED' : 'RELEASED_NOTIFICATION_PENDING';
  }

  /**
   * Re-attempts delivery for released orders whose notification never settled.
   *
   * Safe to run on a timer: the claim is what prevents duplicate sends, not
   * this method's caller.
   */
  async retryPendingNotifications(): Promise<{
    attempted: number;
    notified: number;
    abandoned: number;
  }> {
    const now = this.clock.now();
    const leaseExpiredBefore = new Date(
      now.getTime() - LAB_RESULT_CLAIM_LEASE_MS,
    );
    const pending =
      await this.workflowRepository.findPendingResultNotifications(
        leaseExpiredBefore,
        RESULT_NOTIFICATION_RETRY_BATCH,
      );

    let notified = 0;
    let abandoned = 0;
    for (const order of pending) {
      const claimToken = randomUUID();
      const claimed = await this.workflowRepository.claimResultNotification(
        { id: order.id, clinicId: order.clinicId, claimToken, now },
        leaseExpiredBefore,
      );
      if (!claimed) continue;

      const sent = await this.notifications.deliver(
        order.id,
        order.clinicId,
        claimToken,
      );
      if (sent) {
        notified += 1;
        continue;
      }
      const ctx = await this.workflowRepository.findReleaseContext(
        order.id,
        order.clinicId,
      );
      if (
        ctx &&
        ctx.resultNotificationAttempts >= MAX_RESULT_NOTIFICATION_ATTEMPTS
      ) {
        // Give up loudly rather than retrying a template that will never send.
        abandoned += 1;
        this.logger.error(
          `Abandoning lab result notification for order ${order.id} after ${MAX_RESULT_NOTIFICATION_ATTEMPTS} attempts`,
        );
      }
    }

    return { attempted: pending.length, notified, abandoned };
  }
}

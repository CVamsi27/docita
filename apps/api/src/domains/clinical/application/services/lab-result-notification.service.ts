import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { DATE_FORMATS, formatDate, getPatientFullName } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  StorageProvider,
  GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
} from '@/domains/documents/application/ports/storage-provider.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import type { LabWorkflowRepository } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';

/**
 * How long a caller may hold the notification claim before another worker may
 * take it over. A live claim is never stolen; only an expired one is, which is
 * what keeps "the process died mid-send" recoverable without letting two
 * workers notify the same patient.
 */
export const LAB_RESULT_CLAIM_LEASE_MS = 5 * 60 * 1000;

/** Upper bound on notification retries per release, to stop a poison template. */
export const MAX_RESULT_NOTIFICATION_ATTEMPTS = 5;

/**
 * Delivering one "your result is ready" notification, with its own claim,
 * lease and terminal outcome.
 *
 * Delivery used to be a message send followed by a status write with no record
 * of whether the patient was actually reached. The claim is taken before the
 * send and the outcome is recorded on the order, so a failed or crashed send
 * stays visible and retryable instead of disappearing into a log line while
 * the order reads as handled.
 */
@Injectable()
export class LabResultNotificationService {
  private readonly logger = new Logger(LabResultNotificationService.name);

  constructor(
    @Inject('LabWorkflowRepository')
    private readonly workflowRepository: LabWorkflowRepository,
    private readonly storageProvider: StorageProvider,
    private readonly sendMessage: SendMessageUseCase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Sends the "your result is ready" message if this caller still holds the
   * notification claim. Returns whether the patient was actually reached.
   *
   * Pass the token already claimed by a retry sweep; without one this method
   * claims the notification itself and gives up when another caller holds a
   * live claim.
   */
  async deliver(
    orderId: string,
    clinicId: string,
    existingClaimToken?: string,
  ): Promise<boolean> {
    const now = this.clock.now();
    const claimToken = existingClaimToken ?? randomUUID();

    if (!existingClaimToken) {
      const claimed = await this.workflowRepository.claimResultNotification(
        { id: orderId, clinicId, claimToken, now },
        new Date(now.getTime() - LAB_RESULT_CLAIM_LEASE_MS),
      );
      // Someone else holds a live claim, or it is already settled. Either way
      // this caller must not send.
      if (!claimed) return false;
    }

    const ctx = await this.workflowRepository.findReleaseContext(
      orderId,
      clinicId,
    );
    if (!ctx?.resultUrl) {
      await this.settle(orderId, clinicId, claimToken, {
        status: 'FAILED',
        now: this.clock.now(),
        error: 'Result file missing after release',
      });
      return false;
    }

    // `phoneNumber` is a required column but can hold blanks from older data or
    // manual entry, so a whitespace-only value is no contact, not a delivery.
    const recipientPhone = ctx.patient.phoneNumber?.trim() ?? '';
    if (!recipientPhone) {
      // Not a delivery failure: there is nobody to deliver to. Recording it as
      // skipped keeps "outstanding" meaning "we still owe someone a message".
      this.logger.warn(
        `Lab order ${orderId} released without WhatsApp: patient has no phone number`,
      );
      await this.settle(orderId, clinicId, claimToken, {
        status: 'SKIPPED_NO_CONTACT',
        now: this.clock.now(),
      });
      return false;
    }

    const resultLink = this.storageProvider.supportsSignedUrls
      ? await this.storageProvider.generateSignedUrl(
          ctx.resultUrl,
          GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
        )
      : ctx.resultUrl;

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone,
        templateName: 'lab_result_ready',
        variables: {
          patientName: getPatientFullName(ctx.patient),
          clinicName: ctx.clinicName,
          testName: ctx.testName,
          resultDate: formatDate(now, DATE_FORMATS.DATE_MEDIUM),
          resultLink,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A clinic without the WhatsApp feature is a configuration outcome, not a
      // retryable failure: retrying forever would never succeed.
      if (error instanceof ForbiddenException) {
        this.logger.log(
          `Lab result WhatsApp skipped for order ${orderId}: ${message}`,
        );
        await this.settle(orderId, clinicId, claimToken, {
          status: 'SKIPPED_NO_CONTACT',
          now: this.clock.now(),
          error: message,
        });
        return false;
      }

      this.logger.error(
        `Failed to send lab result WhatsApp for order ${orderId}`,
        error,
      );
      await this.settle(orderId, clinicId, claimToken, {
        status: 'FAILED',
        now: this.clock.now(),
        error: message,
      });
      return false;
    }

    await this.settle(orderId, clinicId, claimToken, {
      status: 'SENT',
      now: this.clock.now(),
    });
    return true;
  }

  private async settle(
    orderId: string,
    clinicId: string,
    claimToken: string,
    outcome: {
      status: 'SENT' | 'FAILED' | 'SKIPPED_NO_CONTACT';
      now: Date;
      error?: string;
    },
  ): Promise<void> {
    try {
      await this.workflowRepository.completeResultNotification(
        orderId,
        clinicId,
        claimToken,
        outcome,
      );
    } catch (error) {
      // The send already happened; losing the bookkeeping must not throw over
      // it, but it must be loud because the row will read as still in-flight.
      this.logger.error(
        `Failed to record lab result notification outcome for order ${orderId}`,
        error,
      );
    }
  }
}

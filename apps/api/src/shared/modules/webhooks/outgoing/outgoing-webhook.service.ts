import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { OutgoingWebhookRepository } from './outgoing-webhook.repository';

const BACKOFF_BASE_MS = 5_000;
const BACKOFF_CAP_MS = 300_000;

function computeSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

interface WebhookEventPayload {
  eventName: string;
  clinicId: string;
  aggregateType: string;
  aggregateId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class OutgoingWebhookService {
  private readonly logger = new Logger(OutgoingWebhookService.name);

  constructor(private readonly repository: OutgoingWebhookRepository) {}

  async dispatch(event: WebhookEventPayload): Promise<void> {
    const subscriptions = await this.repository.findActiveSubscriptions(
      event.eventName,
    );

    if (subscriptions.length === 0) return;

    const payloadJson = JSON.stringify({
      id: randomUUID(),
      event: event.eventName,
      clinicId: event.clinicId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      data: event.data,
      timestamp: event.timestamp,
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const idempotencyKey = `${sub.id}:${event.aggregateId}:${event.timestamp}`;
        try {
          await this.repository.createDelivery({
            subscriptionId: sub.id,
            clinicId: event.clinicId,
            eventName: event.eventName,
            targetUrl: sub.targetUrl,
            payload: JSON.parse(payloadJson),
            idempotencyKey,
          });
        } catch (error) {
          if (this.isUniqueViolation(error)) {
            this.logger.debug(
              `Duplicate webhook delivery skipped: ${idempotencyKey}`,
            );
            return;
          }
          this.logger.error(
            `Failed to enqueue webhook delivery: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }),
    );
  }

  async sendDelivery(delivery: {
    id: string;
    targetUrl: string;
    payload: Record<string, unknown>;
    signingSecret: string;
  }): Promise<boolean> {
    const payloadJson = JSON.stringify(delivery.payload);
    const signature = computeSignature(payloadJson, delivery.signingSecret);

    try {
      const response = await fetchWithTimeout(delivery.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Id': delivery.id,
          'User-Agent': 'Docita-Webhook/1.0',
        },
        body: payloadJson,
      });

      if (response.ok) return true;

      const body = await response.text().catch(() => '');
      this.logger.warn(
        `Webhook delivery ${delivery.id} returned ${response.status}: ${body.slice(0, 500)}`,
      );
      return false;
    } catch (error) {
      this.logger.warn(
        `Webhook delivery ${delivery.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  async tick(): Promise<void> {
    const deliveries = await this.repository.claimPendingDeliveries(100);

    for (const delivery of deliveries) {
      try {
        const delivered = await this.sendDelivery({
          id: delivery.id,
          targetUrl: delivery.targetUrl,
          payload: delivery.payload as Record<string, unknown>,
          signingSecret: 'resolved-from-subscription',
        });

        if (delivered) {
          await this.repository.markDelivered(delivery.id, 200);
        } else {
          if (delivery.attemptCount >= delivery.maxAttempts) {
            await this.repository.markDeadLettered(
              delivery.id,
              `Exhausted ${delivery.maxAttempts} attempts`,
            );
          } else {
            const delay = Math.min(
              BACKOFF_CAP_MS,
              BACKOFF_BASE_MS * Math.pow(2, delivery.attemptCount - 1),
            );
            await this.repository.markFailed(
              delivery.id,
              delivery.lastStatusCode,
              `Retrying in ${delay}ms`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Webhook tick processing error for ${delivery.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as Record<string, unknown>).code === 'P2002'
    );
  }
}

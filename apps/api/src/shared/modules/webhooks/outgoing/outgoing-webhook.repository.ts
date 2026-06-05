import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';

interface WebhookSubscriptionRecord {
  id: string;
  clinicId: string;
  eventName: string;
  targetUrl: string;
  signingSecret: string;
  active: boolean;
  description: string | null;
}

interface OutgoingDeliveryRecord {
  id: string;
  subscriptionId: string;
  clinicId: string;
  eventName: string;
  targetUrl: string;
  payload: Prisma.JsonValue;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  idempotencyKey: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
}

@Injectable()
export class OutgoingWebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveSubscriptions(
    eventName: string,
  ): Promise<WebhookSubscriptionRecord[]> {
    return this.prisma.webhookSubscription.findMany({
      where: { eventName, active: true },
    });
  }

  async createSubscription(data: {
    clinicId: string;
    eventName: string;
    targetUrl: string;
    signingSecret: string;
    description?: string;
  }): Promise<WebhookSubscriptionRecord> {
    return this.prisma.webhookSubscription.create({ data });
  }

  async deactivateSubscription(id: string, clinicId: string): Promise<void> {
    await this.prisma.webhookSubscription.updateMany({
      where: { id, clinicId },
      data: { active: false },
    });
  }

  async createDelivery(data: {
    subscriptionId: string;
    clinicId: string;
    eventName: string;
    targetUrl: string;
    payload: Prisma.InputJsonValue;
    idempotencyKey: string;
  }): Promise<OutgoingDeliveryRecord> {
    return this.prisma.outgoingWebhookDelivery.create({ data });
  }

  async claimPendingDeliveries(
    batchSize = 50,
  ): Promise<OutgoingDeliveryRecord[]> {
    const now = new Date();
    const rows = await this.prisma.$queryRaw<OutgoingDeliveryRecord[]>`
      WITH claimed AS (
        SELECT id
        FROM "OutgoingWebhookDelivery"
        WHERE status IN ('PENDING', 'FAILED')
          AND "attemptCount" < "maxAttempts"
          AND ("scheduledAt" IS NULL OR "scheduledAt" <= ${now})
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      UPDATE "OutgoingWebhookDelivery" d
      SET status = 'IN_FLIGHT',
          "attemptCount" = d."attemptCount" + 1
      FROM claimed
      WHERE d.id = claimed.id
      RETURNING d.*
    `;
    return rows;
  }

  async markDelivered(id: string, statusCode: number): Promise<void> {
    await this.prisma.outgoingWebhookDelivery.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        lastStatusCode: statusCode,
        completedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markFailed(
    id: string,
    statusCode: number | null,
    error: string,
  ): Promise<void> {
    await this.prisma.outgoingWebhookDelivery.update({
      where: { id },
      data: {
        lastStatusCode: statusCode,
        lastError: error.slice(0, 1000),
      },
    });
  }

  async markDeadLettered(id: string, error: string): Promise<void> {
    await this.prisma.outgoingWebhookDelivery.update({
      where: { id },
      data: {
        status: 'DEAD_LETTERED',
        lastError: error.slice(0, 1000),
        completedAt: new Date(),
      },
    });
  }

  async getDeadLetteredDeliveries(
    clinicId?: string,
  ): Promise<OutgoingDeliveryRecord[]> {
    const where: Prisma.OutgoingWebhookDeliveryWhereInput = {
      status: 'DEAD_LETTERED',
    };
    if (clinicId) where.clinicId = clinicId;
    return this.prisma.outgoingWebhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

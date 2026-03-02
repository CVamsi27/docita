import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { ResponseHandlerService } from './response-handler.service';
import { AppointmentStatus, Prisma, WhatsappLogStatus } from '@workspace/db';
import { WhatsAppWebhookPayload } from '@workspace/types';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientService,
    @Inject(forwardRef(() => ResponseHandlerService))
    private readonly responseHandler: ResponseHandlerService,
  ) {}

  validateWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const appSecret = this.whatsappClient.AppSecret;
    if (!signature || !appSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    return `sha256=${expectedSignature}` === signature;
  }

  getVerifyToken(): string {
    return this.whatsappClient.VerifyToken;
  }

  async processIncomingMessages(
    value: WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'],
  ) {
    for (const message of value.messages || []) {
      const contact = value.contacts?.[0];
      const phoneNumber = message.from;
      const profileName = contact?.profile?.name;

      this.logger.log(
        `Incoming WhatsApp from ${phoneNumber} (${profileName}): type=${message.type}`,
      );

      let responseText = '';
      let buttonId = '';

      if (message.type === 'text' && message.text) {
        responseText = message.text.body;
      } else if (message.type === 'interactive' && message.interactive) {
        if (message.interactive.button_reply) {
          buttonId = message.interactive.button_reply.id;
          responseText = message.interactive.button_reply.title;
        } else if (message.interactive.list_reply) {
          buttonId = message.interactive.list_reply.id;
          responseText = message.interactive.list_reply.title;
        }
      } else if (message.type === 'button' && message.button) {
        buttonId = message.button.payload;
        responseText = message.button.text;
      }

      const response = buttonId || responseText;

      if (response) {
        try {
          const recentAppointment =
            await this.findRecentAppointmentByPhone(phoneNumber);
          if (recentAppointment) {
            await this.responseHandler.handlePatientResponse(
              recentAppointment.id,
              response,
              phoneNumber,
              message.id,
            );
          } else {
            this.logger.warn(
              `No recent appointment found for phone: ${phoneNumber}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing incoming message from ${phoneNumber}:`,
            error instanceof Error ? error.stack : error,
          );
        }
      }
    }
  }

  async processStatusUpdates(
    value: WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'],
  ) {
    for (const status of value.statuses || []) {
      this.logger.log(`Status update for ${status.id}: ${status.status}`);

      try {
        const log = await this.prisma.whatsappLog.findFirst({
          where: { providerMessageId: status.id },
        });

        if (log) {
          const updateData: Record<string, unknown> = {
            status: status.status.toUpperCase() as WhatsappLogStatus,
            responseBody: toJsonValue(status),
          };

          if (status.status === 'delivered' || status.status === 'read') {
            updateData.deliveredAt = new Date(
              parseInt(status.timestamp, 10) * 1000,
            );
          }

          if (status.status === 'failed' && status.errors?.length) {
            updateData.errorMessage = status.errors
              .map((e) => `${e.code}: ${e.title}`)
              .join('; ');
          }

          await this.prisma.whatsappLog.update({
            where: { id: log.id },
            data: updateData,
          });
        }
      } catch (error) {
        this.logger.error('Error processing status update:', error);
      }
    }
  }

  private async findRecentAppointmentByPhone(phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const phoneVariants = [
      phoneNumber,
      cleanPhone,
      `+${cleanPhone}`,
      cleanPhone.slice(-10),
    ];

    const patient = await this.prisma.patient.findFirst({
      where: {
        phoneNumber: { in: phoneVariants },
      },
      select: { id: true },
    });

    if (!patient) return null;

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    return this.prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        startTime: { gte: twoHoursAgo },
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }
}

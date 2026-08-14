import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientAdapter } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.adapter';
import {
  whatsappBroadcastJobStatusSchema,
  type CreateWhatsAppBroadcastJobRequest,
  type WhatsAppBroadcastJobDetail,
  type WhatsAppBroadcastJobSummary,
  type WhatsAppBroadcastRecipientInput,
} from '@workspace/types';
import { isRecord, parseStringEnumMember } from '@workspace/utils';

const SEND_DELAY_MS = 250;
const MAX_RECIPIENTS = 10000;
const BROADCAST_JOB_STATUSES = whatsappBroadcastJobStatusSchema.options;

function parseBroadcastVariables(
  value: unknown,
): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

@Injectable()
export class WhatsAppBroadcastService {
  private readonly logger = new Logger(WhatsAppBroadcastService.name);
  private readonly inFlightJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientAdapter,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async createBroadcast(
    input: CreateWhatsAppBroadcastJobRequest,
    createdBy?: string,
  ): Promise<WhatsAppBroadcastJobSummary> {
    const normalizedRecipients = this.normalizeRecipients(input.recipients);
    if (normalizedRecipients.length === 0)
      throw new BadRequestException('At least one valid recipient is required');
    if (normalizedRecipients.length > MAX_RECIPIENTS) {
      throw new BadRequestException(
        `Recipient count exceeds the maximum of ${MAX_RECIPIENTS}`,
      );
    }

    const job = await this.prisma.whatsAppBroadcastJob.create({
      data: {
        title: input.title,
        audienceLabel: input.audienceLabel ?? null,
        templateName: input.templateName ?? null,
        languageCode: input.languageCode ?? 'en',
        messageText: input.messageText ?? null,
        totalCount: normalizedRecipients.length,
        status: 'PENDING',
        createdBy: createdBy ?? null,
        recipients: {
          create: normalizedRecipients.map((recipient) => ({
            phoneNumber: recipient.phoneNumber,
            name: recipient.name ?? null,
            variables: recipient.variables
              ? JSON.parse(JSON.stringify(recipient.variables))
              : null,
            status: 'PENDING',
          })),
        },
      },
    });

    void this.processBroadcastJob(job.id).catch((error) => {
      this.logger.error(
        `Broadcast job ${job.id} failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    });

    return this.toSummary(job);
  }

  async listJobs(limit = 50): Promise<WhatsAppBroadcastJobSummary[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    const jobs = await this.prisma.whatsAppBroadcastJob.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
    return jobs.map((job) => this.toSummary(job));
  }

  async getJob(jobId: string): Promise<WhatsAppBroadcastJobDetail> {
    const job = await this.prisma.whatsAppBroadcastJob.findUnique({
      where: { id: jobId },
      include: {
        recipients: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) throw new NotFoundException('Broadcast job not found');

    return {
      ...this.toSummary(job),
      recipients: job.recipients.map((recipient) => ({
        id: recipient.id,
        broadcastJobId: recipient.broadcastJobId,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
        status: recipient.status,
        providerMessageId: recipient.providerMessageId,
        errorMessage: recipient.errorMessage,
        sentAt: recipient.sentAt,
        createdAt: recipient.createdAt,
      })),
    };
  }

  private async processBroadcastJob(jobId: string): Promise<void> {
    if (this.inFlightJobs.has(jobId)) {
      return;
    }
    this.inFlightJobs.add(jobId);

    try {
      const job = await this.prisma.whatsAppBroadcastJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING', startedAt: this.clock.now() },
      });

      const recipients = await this.prisma.whatsAppBroadcastRecipient.findMany({
        where: { broadcastJobId: jobId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });

      let sentCount = job.sentCount;
      let failedCount = job.failedCount;

      for (const recipient of recipients) {
        try {
          const result = await this.sendToRecipient({
            phoneNumber: recipient.phoneNumber,
            templateName: job.templateName,
            languageCode: job.languageCode,
            messageText: job.messageText,
            variables: parseBroadcastVariables(recipient.variables) ?? null,
            recipientName: recipient.name,
          });

          await this.prisma.whatsAppBroadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              providerMessageId: result.messageId ?? null,
              errorMessage: result.success ? null : (result.error ?? null),
              sentAt: result.success ? this.clock.now() : null,
            },
          });

          if (result.success) {
            sentCount += 1;
          } else {
            failedCount += 1;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Failed to send broadcast to ${recipient.phoneNumber} for job ${jobId}: ${errorMessage}`,
          );
          await this.prisma.whatsAppBroadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'FAILED',
              errorMessage,
            },
          });
          failedCount += 1;
        }

        await this.prisma.whatsAppBroadcastJob.update({
          where: { id: jobId },
          data: { sentCount, failedCount },
        });

        await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
      }

      await this.prisma.whatsAppBroadcastJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: this.clock.now(),
          sentCount,
          failedCount,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Broadcast job ${jobId} aborted: ${errorMessage}`);
      await this.prisma.whatsAppBroadcastJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage,
          completedAt: this.clock.now(),
        },
      });
    } finally {
      this.inFlightJobs.delete(jobId);
    }
  }

  private async sendToRecipient(input: {
    phoneNumber: string;
    templateName: string | null;
    languageCode: string;
    messageText: string | null;
    variables: Record<string, string> | null;
    recipientName: string | null;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      if (input.templateName) {
        const components = this.buildTemplateComponents(input.variables);
        const result = await this.whatsappClient.sendTemplate({
          to: input.phoneNumber,
          templateName: input.templateName,
          languageCode: input.languageCode,
          components: components.length ? components : undefined,
        });
        return {
          success: !!result.success,
          messageId: result.messageId ?? undefined,
        };
      }

      if (input.messageText) {
        const finalText = this.interpolate(input.messageText, {
          name: input.recipientName ?? '',
          ...(input.variables ?? {}),
        });
        const result = await this.whatsappClient.sendTextMessage({
          to: input.phoneNumber,
          message: finalText,
        });
        return {
          success: !!result.success,
          messageId: result.messageId ?? undefined,
        };
      }

      return { success: false, error: 'No template or message text provided' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildTemplateComponents(
    variables: Record<string, string> | null,
  ): Array<{
    type: 'body';
    parameters: Array<{ type: 'text'; text: string }>;
  }> {
    if (!variables) return [];

    const orderedKeys = Object.keys(variables).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    const parameters = orderedKeys
      .map((key) => ({ type: 'text' as const, text: String(variables[key]) }))
      .filter((param) => param.text.length > 0);

    if (parameters.length === 0) return [];

    return [{ type: 'body', parameters }];
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key: string) => {
      const value = vars[key];
      return value !== undefined ? value : '';
    });
  }

  private normalizeRecipients(
    recipients: WhatsAppBroadcastRecipientInput[],
  ): WhatsAppBroadcastRecipientInput[] {
    const seen = new Set<string>();
    const normalized: WhatsAppBroadcastRecipientInput[] = [];

    for (const recipient of recipients) {
      const phone = this.normalizePhoneNumber(recipient.phoneNumber);
      if (!phone || phone.length < 10) continue;
      if (seen.has(phone)) continue;
      seen.add(phone);
      normalized.push({
        phoneNumber: phone,
        name: recipient.name?.trim() || undefined,
        variables: recipient.variables,
      });
    }

    return normalized;
  }

  private normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  private toSummary(job: {
    id: string;
    title: string;
    audienceLabel: string | null;
    templateName: string | null;
    languageCode: string;
    messageText: string | null;
    totalCount: number;
    sentCount: number;
    failedCount: number;
    status: string;
    createdBy: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): WhatsAppBroadcastJobSummary {
    return {
      id: job.id,
      title: job.title,
      audienceLabel: job.audienceLabel,
      templateName: job.templateName,
      languageCode: job.languageCode,
      messageText: job.messageText,
      totalCount: job.totalCount,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      status:
        parseStringEnumMember(BROADCAST_JOB_STATUSES, job.status) ?? 'PENDING',
      createdBy: job.createdBy,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

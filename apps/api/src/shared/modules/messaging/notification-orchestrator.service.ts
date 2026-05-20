import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { IMessageChannel, SendMessageResult } from './channels';
import { MessageTemplateService } from './templates';

export interface NotificationRequest {
  templateKey: string;
  recipientId: string;
  channels: string[];
  variables?: Record<string, unknown>;
}

export interface NotificationResult {
  templateKey: string;
  recipientId: string;
  results: SendMessageResult[];
  successCount: number;
  failureCount: number;
}

@Injectable()
export class NotificationOrchestrator {
  private readonly logger = new Logger(NotificationOrchestrator.name);
  private channels: Map<string, IMessageChannel> = new Map();

  constructor(
    private templateService: MessageTemplateService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  registerChannel(channel: IMessageChannel): void {
    this.channels.set(channel.getName(), channel);
  }

  async sendNotification(
    request: NotificationRequest,
  ): Promise<NotificationResult> {
    const results: SendMessageResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const channelName of request.channels) {
      const channel = this.channels.get(channelName);
      if (!channel) {
        this.logger.warn(`Channel ${channelName} not registered`);
        failureCount++;
        continue;
      }

      try {
        const isAvailable = await channel.isAvailable();
        if (!isAvailable) {
          this.logger.warn(`Channel ${channelName} is not available`);
          failureCount++;
          continue;
        }

        const _message = this.templateService.processTemplate(
          request.templateKey,
          channelName.toLowerCase(),
          request.variables || {},
        );

        const result = await channel.send(request.recipientId, {
          templateKey: request.templateKey,
          variables: request.variables,
        });

        results.push(result);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send notification via ${channelName}: ${error instanceof Error ? error.message : String(error)}`,
        );
        failureCount++;
        results.push({
          messageId: `failed_${Date.now()}`,
          status: 'failed',
          channel: channelName,
          sentAt: this.clock.now(),
          error: String(error),
        });
      }
    }

    return {
      templateKey: request.templateKey,
      recipientId: request.recipientId,
      results,
      successCount,
      failureCount,
    };
  }

  async sendWithFallback(
    request: NotificationRequest,
    primary: string,
    fallbacks: string[] = [],
  ): Promise<SendMessageResult> {
    const channels = [primary, ...fallbacks];

    for (const channelName of channels) {
      const channel = this.channels.get(channelName);
      if (!channel) {
        continue;
      }

      try {
        const isAvailable = await channel.isAvailable();
        if (!isAvailable) {
          continue;
        }

        return await channel.send(request.recipientId, {
          templateKey: request.templateKey,
          variables: request.variables,
        });
      } catch (_error) {
        this.logger.warn(`Channel ${channelName} failed, trying fallback`);
        continue;
      }
    }

    throw new Error('All notification channels exhausted');
  }
}

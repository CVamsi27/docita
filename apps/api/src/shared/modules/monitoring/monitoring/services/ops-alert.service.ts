import { Injectable, Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export type OpsAlertPayload = {
  title: string;
  text: string;
  severity?: 'warn' | 'page';
  tags?: Record<string, string | number>;
};

@Injectable()
export class OpsAlertService {
  private readonly logger = new Logger(OpsAlertService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  async notify(payload: OpsAlertPayload): Promise<void> {
    const webhookUrl = this.appConfig.getOpsAlertWebhookUrl();
    if (!webhookUrl) {
      return;
    }

    const severity = payload.severity ?? 'warn';
    const tagLine = payload.tags
      ? Object.entries(payload.tags)
          .map(([key, value]) => `${key}=${value}`)
          .join(' ')
      : '';
    const text = [
      `[${severity.toUpperCase()}] ${payload.title}`,
      payload.text,
      tagLine,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await fetchWithTimeout(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Ops alert webhook returned ${response.status} for "${payload.title}"`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Ops alert webhook failed for "${payload.title}": ${message}`,
      );
    }
  }
}

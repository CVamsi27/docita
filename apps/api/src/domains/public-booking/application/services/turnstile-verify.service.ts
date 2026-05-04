import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface TurnstileVerifyResponse {
  success?: boolean;
}

@Injectable()
export class TurnstileVerifyService {
  private readonly logger = new Logger(TurnstileVerifyService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  /**
   * When TURNSTILE_SECRET_KEY is unset, verification is skipped (local dev).
   * When set, a non-empty token is required and must pass Cloudflare siteverify.
   */
  async verifyToken(
    token: string | undefined,
    remoteIp?: string,
  ): Promise<boolean> {
    const secret = this.appConfig.getTurnstileSecretKey();
    if (!secret) {
      return true;
    }
    if (!token || token.trim().length === 0) {
      return false;
    }

    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token.trim());
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        },
      );
      const data = (await response.json()) as TurnstileVerifyResponse;
      return data.success === true;
    } catch (error) {
      this.logger.warn(
        'Turnstile siteverify request failed',
        error instanceof Error ? error.message : 'unknown',
      );
      return false;
    }
  }
}

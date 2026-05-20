import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { TurnstileSiteverifyClient } from '@/domains/public-booking/infrastructure/clients/turnstile-siteverify.client';

@Injectable()
export class TurnstileVerifyService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly turnstileClient: TurnstileSiteverifyClient,
  ) {}

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

    return this.turnstileClient.verifySiteToken(secret, token.trim(), remoteIp);
  }
}

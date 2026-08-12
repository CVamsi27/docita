import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { TurnstileSiteverifyClient } from './turnstile-siteverify.client';

const VERIFICATION_REQUIRED_MESSAGE =
  'Security verification is required. Please complete the verification challenge and try again.';
const VERIFICATION_FAILED_MESSAGE =
  'Security verification failed. Please retry the verification challenge.';

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
    if (!secret) return true;
    if (!token || token.trim().length === 0) {
      return false;
    }

    return this.turnstileClient.verifySiteToken(secret, token.trim(), remoteIp);
  }

  /**
   * Fail-closed guard for the auth surface (P5.17): throws a 400 when
   * enforcement is configured (TURNSTILE_SECRET_KEY set) and the token is
   * missing or fails siteverify. No-op when enforcement is off, so local dev
   * and e2e flows without credentials keep working unchanged — the rate
   * limiter + lockout remain the always-on protection.
   */
  async assertValidToken(
    token: string | undefined,
    remoteIp?: string,
  ): Promise<void> {
    const secret = this.appConfig.getTurnstileSecretKey();
    if (!secret) return;

    if (!token || token.trim().length === 0) {
      throw new BadRequestException(VERIFICATION_REQUIRED_MESSAGE);
    }

    const ok = await this.turnstileClient.verifySiteToken(
      secret,
      token.trim(),
      remoteIp,
    );
    if (!ok) {
      throw new BadRequestException(VERIFICATION_FAILED_MESSAGE);
    }
  }
}

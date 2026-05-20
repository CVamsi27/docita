import { Injectable, Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';

interface TurnstileVerifyResponse {
  success?: boolean;
}

@Injectable()
export class TurnstileSiteverifyClient {
  private readonly logger = new Logger(TurnstileSiteverifyClient.name);

  async verifySiteToken(
    secret: string,
    token: string,
    remoteIp?: string,
  ): Promise<boolean> {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    try {
      const response = await fetchWithTimeout(
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

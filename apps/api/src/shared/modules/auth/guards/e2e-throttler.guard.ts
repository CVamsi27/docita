import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';
import { getEnv } from '@/shared/modules/config/app-config';
import { shouldBypassGuardForE2eConfig } from '@/shared/modules/config/app-configuration-values';

@Injectable()
export class E2EThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, unknown>;
    }>();

    const e2eHeader = request?.headers?.['x-docita-e2e'];
    const e2eValue = Array.isArray(e2eHeader)
      ? String(e2eHeader[0])
      : typeof e2eHeader === 'string'
        ? e2eHeader
        : undefined;
    const env = getEnv();
    // Single source of truth for the e2e bypass (VULN-001 hardening): the
    // header alone only counts under `test`; prod/staging never bypass.
    if (
      shouldBypassGuardForE2eConfig({
        nodeEnv: env.NODE_ENV,
        apiE2eEnabled: env.DOCITA_API_E2E === 'true',
        e2eHeaderValue: e2eValue,
      })
    ) {
      return true;
    }

    return super.shouldSkip(context);
  }
}

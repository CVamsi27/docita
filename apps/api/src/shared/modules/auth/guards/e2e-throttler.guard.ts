import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';
import { getEnv } from '@/shared/modules/config/app-config';

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
    const isNonProduction = env.NODE_ENV !== 'production';
    if (
      isNonProduction &&
      (env.DOCITA_API_E2E === 'true' ||
        (e2eValue === 'true' && isNonProduction))
    ) {
      return true;
    }

    return super.shouldSkip(context);
  }
}

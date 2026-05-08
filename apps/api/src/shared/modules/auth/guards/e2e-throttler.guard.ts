import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class E2EThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, unknown>;
    }>();

    const e2eHeader = request?.headers?.['x-docita-e2e'];
    const e2eValue = Array.isArray(e2eHeader) ? e2eHeader[0] : e2eHeader;
    if (
      (process.env.DOCITA_API_E2E === 'true' ||
        (e2eValue === 'true' && process.env.NODE_ENV !== 'production')) &&
      process.env.NODE_ENV !== 'production'
    ) {
      return true;
    }

    return super.shouldSkip(context);
  }
}

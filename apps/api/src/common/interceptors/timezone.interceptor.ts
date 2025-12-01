import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_TIMEZONE, DEFAULT_LOCALE } from '@workspace/types';

/**
 * Extended Request interface with timezone context
 */
export interface RequestWithTimezone extends Request {
  timezone: string;
  locale: string;
  user?: {
    id?: string;
    clinicId?: string;
    [key: string]: unknown;
  };
}

/**
 * Timezone Interceptor
 *
 * This interceptor extracts the clinic's timezone and locale settings
 * and attaches them to the request object for use in downstream handlers.
 *
 * Usage in controllers/services:
 * ```typescript
 * @Get()
 * async getData(@Req() req: RequestWithTimezone) {
 *   const { timezone, locale } = req;
 *   // Use timezone and locale for date formatting
 * }
 * ```
 */
@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithTimezone>();

    // Set defaults
    request.timezone = DEFAULT_TIMEZONE;
    request.locale = DEFAULT_LOCALE;

    // Try to get clinic-specific settings if user is authenticated
    const user = request.user;
    if (user?.clinicId) {
      try {
        const clinic = await this.prisma.clinic.findUnique({
          where: { id: user.clinicId },
          select: {
            timezone: true,
            locale: true,
          },
        });

        if (clinic) {
          request.timezone = clinic.timezone || DEFAULT_TIMEZONE;
          request.locale = clinic.locale || DEFAULT_LOCALE;
        }
      } catch {
        // Silently fall back to defaults if clinic lookup fails
      }
    }

    return next.handle();
  }
}

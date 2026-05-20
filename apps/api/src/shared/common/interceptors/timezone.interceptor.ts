import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { DEFAULT_TIMEZONE, DEFAULT_LOCALE } from '@workspace/utils';

export interface RequestWithTimezone extends Request {
  timezone: string;
  locale: string;
  user?: {
    id?: string;
    clinicId?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimezoneInterceptor.name);

  constructor(private prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithTimezone>();

    request.timezone = DEFAULT_TIMEZONE;
    request.locale = DEFAULT_LOCALE;

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
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown timezone lookup failure';
        this.logger.warn(`Falling back to default locale/timezone: ${message}`);
      }
    }

    return next.handle();
  }
}

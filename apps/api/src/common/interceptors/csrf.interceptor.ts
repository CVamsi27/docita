import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
  constructor(private configService: AppConfigService) {}

  private isSafeMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // CSRF protection is only needed for cookie-based auth.
    // Bearer token requests are inherently CSRF-safe.
    const authHeader = request.headers['authorization'] as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      return next.handle();
    }

    const existingCsrfToken = request.cookies?.['XSRF-TOKEN'];
    let csrfToken = existingCsrfToken;

    if (!existingCsrfToken && this.isSafeMethod(request.method)) {
      csrfToken = randomBytes(24).toString('hex');
      response.cookie('XSRF-TOKEN', csrfToken, {
        path: '/',
        sameSite: 'strict',
        secure: this.configService.isProduction(),
        httpOnly: false,
      });
    }

    if (!this.isSafeMethod(request.method)) {
      const headerToken = request.headers['x-xsrf-token'];

      if (!csrfToken || !headerToken || csrfToken !== headerToken) {
        throw new ForbiddenException('Invalid or missing CSRF token');
      }
    }

    return next.handle();
  }
}

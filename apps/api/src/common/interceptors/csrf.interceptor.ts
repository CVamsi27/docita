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

  private static readonly AUTH_PATH_PATTERNS = [
    /^\/api(?:\/v\d+)?\/auth(?:\/|$)/i,
    /^\/auth(?:\/|$)/i,
  ];

  private isSafeMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }

  private setCsrfCookie(response: Response, csrfToken: string): void {
    const domain = this.configService.getSharedCookieDomain();
    response.cookie('XSRF-TOKEN', csrfToken, {
      path: '/',
      sameSite: 'strict',
      secure: this.configService.isProduction(),
      httpOnly: false,
      ...(domain ? { domain } : {}),
    });
  }

  private getHeaderToken(request: Request): string | undefined {
    const token = request.headers['x-xsrf-token'];
    if (Array.isArray(token)) {
      return token[0];
    }
    return typeof token === 'string' ? token : undefined;
  }

  private getRequestPath(request: Request): string {
    const rawPath = request.originalUrl ?? request.url ?? '';
    return rawPath.split('?')[0];
  }

  private isAuthPath(path: string): boolean {
    return CsrfInterceptor.AUTH_PATH_PATTERNS.some((pattern) =>
      pattern.test(path),
    );
  }

  private hasSessionCookie(request: Request): boolean {
    const cookies = request.cookies ?? {};
    return Boolean(cookies['access_token'] || cookies['refresh_token']);
  }

  private canBootstrapCsrfForAuthMutation(
    request: Request,
    csrfToken: string | undefined,
    headerToken: string | undefined,
  ): boolean {
    if (csrfToken || headerToken) {
      return false;
    }

    if (this.hasSessionCookie(request)) {
      return false;
    }

    return this.isAuthPath(this.getRequestPath(request));
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
      this.setCsrfCookie(response, csrfToken);
    }

    if (!this.isSafeMethod(request.method)) {
      const headerToken = this.getHeaderToken(request);

      if (
        this.canBootstrapCsrfForAuthMutation(request, csrfToken, headerToken)
      ) {
        csrfToken = randomBytes(24).toString('hex');
        this.setCsrfCookie(response, csrfToken);
        return next.handle();
      }

      if (!csrfToken || !headerToken || csrfToken !== headerToken) {
        throw new ForbiddenException('Invalid or missing CSRF token');
      }
    }

    return next.handle();
  }
}

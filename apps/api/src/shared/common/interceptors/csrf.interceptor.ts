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
import { readRequestHeaderString } from '@/shared/common/http/client-ip';

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
    const baseOptions = {
      path: '/',
      sameSite: 'strict',
      secure: this.configService.isProduction(),
      httpOnly: true,
    } as const;

    // Always set a host-only cookie (api host) so existing sessions continue
    // to work and any legacy host-only cookie is overwritten.
    response.cookie('XSRF-TOKEN', csrfToken, baseOptions);

    // Expose the token in a response header (CORS-exposed) so clients can echo
    // X-XSRF-TOKEN without reading the httpOnly cookie via document.cookie.
    response.setHeader('X-CSRF-Token', csrfToken);

    if (domain) {
      response.cookie('XSRF-TOKEN', csrfToken, { ...baseOptions, domain });
    }
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

  /** Public browser RUM beacons do not carry CSRF headers. */
  private isPublicWebVitalsPost(request: Request): boolean {
    if (request.method?.toUpperCase() !== 'POST') {
      return false;
    }
    const path = this.getRequestPath(request);
    return /^\/api\/v\d+\/monitoring\/web-vitals$/i.test(path);
  }

  /** Unauthenticated online booking (may be cross-site; no session CSRF cookie). */
  private isPublicBookingWrite(request: Request): boolean {
    const method = request.method?.toUpperCase() ?? '';
    if (method !== 'POST') {
      return false;
    }
    const path = this.getRequestPath(request);
    return (
      /^\/api(?:\/v\d+)?\/public\/booking\/clinics\//i.test(path) ||
      /^\/public\/booking\/clinics\//i.test(path)
    );
  }

  private hasSessionCookie(request: Request): boolean {
    const cookies = request.cookies ?? {};
    return Boolean(cookies['access_token'] || cookies['refresh_token']);
  }

  private canBootstrapCsrfForAuthMutation(request: Request): boolean {
    return (
      this.isAuthPath(this.getRequestPath(request)) &&
      !this.hasSessionCookie(request)
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // CSRF protection is only needed for cookie-based auth.
    // Bearer token requests are inherently CSRF-safe.
    const authHeader = readRequestHeaderString(
      request.headers,
      'authorization',
    );
    if (authHeader?.startsWith('Bearer ')) {
      return next.handle();
    }

    const existingCsrfToken = request.cookies?.['XSRF-TOKEN'];
    let csrfToken = existingCsrfToken;
    if (this.isSafeMethod(request.method)) {
      if (!csrfToken) {
        csrfToken = randomBytes(24).toString('hex');
      }

      // Always re-issue the token on safe requests. This keeps the host-only and
      // shared-domain cookies in sync and helps browsers converge after we
      // migrate cookie domains in production.
      this.setCsrfCookie(response, csrfToken);
    }

    if (!this.isSafeMethod(request.method)) {
      if (
        this.isPublicWebVitalsPost(request) ||
        this.isPublicBookingWrite(request)
      ) {
        return next.handle();
      }

      const headerToken = this.getHeaderToken(request);

      if (this.canBootstrapCsrfForAuthMutation(request)) {
        if (!csrfToken) {
          csrfToken = randomBytes(24).toString('hex');
          this.setCsrfCookie(response, csrfToken);
        }

        return next.handle();
      }

      if (!csrfToken || !headerToken || csrfToken !== headerToken) {
        throw new ForbiddenException('Invalid or missing CSRF token');
      }
    }

    return next.handle();
  }
}

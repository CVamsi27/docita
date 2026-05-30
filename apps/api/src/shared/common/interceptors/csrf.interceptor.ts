import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response, Request } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { readRequestHeaderString } from '@/shared/common/http/client-ip';

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
  constructor(private configService: AppConfigService) {}

  private static readonly AUTH_PATH_PATTERNS = [
    /^\/api(?:\/v\d+)?\/auth(?:\/|$)/i,
    /^\/auth(?:\/|$)/i,
  ];

  /**
   * Pre-authentication endpoints: by definition there is no authenticated
   * session yet, so they must always bootstrap a CSRF token — even if the
   * browser happens to be carrying stale `access_token` / `refresh_token`
   * cookies from a previous, no-longer-valid session (DB reset, forced
   * revocation, deploy that invalidated tokens, cross-environment cookie
   * leakage on the same host).
   *
   * Endpoints intentionally NOT in this list (`refresh`, `logout`,
   * `change-password`) require a valid session and keep the strict
   * double-submit check.
   */
  private static readonly PRE_AUTH_PATH_PATTERNS = [
    /^\/(?:api(?:\/v\d+)?\/)?auth\/check-email\/?$/i,
    /^\/(?:api(?:\/v\d+)?\/)?auth\/login\/?$/i,
    /^\/(?:api(?:\/v\d+)?\/)?auth\/mfa\/verify\/?$/i,
    /^\/(?:api(?:\/v\d+)?\/)?auth\/register\/?$/i,
    /^\/(?:api(?:\/v\d+)?\/)?auth\/verify-email\/?$/i,
    /^\/(?:api(?:\/v\d+)?\/)?auth\/resend-verification\/?$/i,
    /^\/(?:api(?:\/v\d+)?\/)?auth\/forgot-password\/?$/i,
    /^\/(?:api(?:\/v\d+)?\/)?auth\/reset-password\/?$/i,
  ];

  private isSafeMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }

  /**
   * Header-exposed double-submit variant.
   *
   * The XSRF-TOKEN cookie is httpOnly so XSS cannot read it via
   * document.cookie. The same token is mirrored on the X-CSRF-Token
   * response header so the client can pick it up and echo it back as
   * X-XSRF-TOKEN on mutating requests. See design doc §7.5 / §7.5.1.
   *
   * NOTE: any layer between this interceptor and the browser (CDN,
   * Next proxy at apps/app/app/api/v1/[...path]/route.ts, future caching
   * layer) MUST pass the X-CSRF-Token response header through — stripping
   * it silently breaks login.
   */
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

  private isPreAuthPath(path: string): boolean {
    return CsrfInterceptor.PRE_AUTH_PATH_PATTERNS.some((pattern) =>
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

  /**
   * Auth endpoints (login, register, password reset, refresh) need a special
   * exemption: the first POST to /auth/login arrives with no session cookie
   * and therefore no XSRF-TOKEN cookie to echo. A pre-session attacker has
   * nothing to forge anyway — there is no authenticated state to abuse — so
   * we mint a fresh CSRF token on the response and let the request through.
   *
   * The exemption is narrow:
   *   - path must be /auth/* (the only routes that bootstrap a session)
   *   - request must have no access_token and no refresh_token cookie
   * Once a session cookie exists, this returns false and the full
   * double-submit check applies, including to /auth/logout and /auth/refresh.
   */
  private canBootstrapCsrfForAuthMutation(request: Request): boolean {
    const path = this.getRequestPath(request);
    // Pre-login endpoints always bootstrap, even if stale session cookies are
    // present — those cookies cannot represent a valid session if the user is
    // hitting login/register/etc. See PRE_AUTH_PATH_PATTERNS.
    if (this.isPreAuthPath(path)) {
      return true;
    }
    return this.isAuthPath(path) && !this.hasSessionCookie(request);
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

      if (
        !csrfToken ||
        !headerToken ||
        !safeTokenEqual(csrfToken, headerToken)
      ) {
        throw forbiddenProblem(
          'INVALID_CSRF_TOKEN',
          'Invalid or missing CSRF token',
        );
      }
    }

    return next.handle();
  }
}

/**
 * Constant-time string equality for CSRF tokens. `===` short-circuits on
 * the first mismatching character, leaking information through response
 * timing that lets an attacker walk the token character by character.
 *
 * crypto.timingSafeEqual requires equal-length buffers, so we compare
 * lengths first (also constant-time enough for this purpose — the
 * length itself is not the secret).
 */
function safeTokenEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

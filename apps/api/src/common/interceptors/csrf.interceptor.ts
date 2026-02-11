import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 1. Generate and set token if it doesn't exist
    let csrfToken = request.cookies?.['XSRF-TOKEN'];
    if (!csrfToken) {
      csrfToken = randomBytes(24).toString('hex');
      // Set the cookie. Important: HttpOnly MUST be false so the frontend can read it
      // to put it into the header for mutating requests.
      response.cookie('XSRF-TOKEN', csrfToken, {
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false, // Accessible by frontend JS
      });
    }

    // 2. Validate on mutating requests
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(request.method)) {
      const headerToken = request.headers['x-xsrf-token'];

      if (!csrfToken || !headerToken || csrfToken !== headerToken) {
        throw new ForbiddenException('Invalid or missing CSRF token');
      }
    }

    return next.handle();
  }
}

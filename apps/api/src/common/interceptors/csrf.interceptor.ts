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
import { AppConfigService } from '../../shared/modules/config/app-configuration.service';

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
  constructor(private configService: AppConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const existingCsrfToken = request.cookies?.['XSRF-TOKEN'];
    let csrfToken = existingCsrfToken;

    if (!existingCsrfToken) {
      csrfToken = randomBytes(24).toString('hex');
      response.cookie('XSRF-TOKEN', csrfToken, {
        path: '/',
        sameSite: 'strict',
        secure: this.configService.isProduction(),
        httpOnly: false,
      });
    }

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(request.method)) {
      if (!existingCsrfToken) {
        return next.handle();
      }

      const headerToken = request.headers['x-xsrf-token'];

      if (!csrfToken || !headerToken || csrfToken !== headerToken) {
        throw new ForbiddenException('Invalid or missing CSRF token');
      }
    }

    return next.handle();
  }
}

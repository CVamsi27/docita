import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly configService: AppConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const timeoutMs = this.configService.isProduction() ? 60000 : 30000;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timed out'),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}

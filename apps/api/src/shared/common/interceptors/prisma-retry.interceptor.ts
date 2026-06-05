import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, tap, mergeMap } from 'rxjs/operators';
import { Prisma } from '@workspace/db';

const TRANSIENT_ERROR_CODES = new Set([
  'P1000', // Authentication failed
  'P1001', // Can't reach database
  'P1008', // Connection timed out
  'P1017', // Server closed connection
  'P2028', // Transaction acquire timeout
]);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

@Injectable()
export class PrismaRetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PrismaRetryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    let attemptCount = 0;
    return next.handle().pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error) => {
            if (!this.isTransientPrismaError(error)) {
              return throwError(() => error);
            }
            attemptCount++;
            if (attemptCount > MAX_RETRIES) {
              return throwError(() => error);
            }
            const delayMs = Math.min(
              BASE_DELAY_MS * Math.pow(2, attemptCount - 1),
              2000,
            );
            return timer(delayMs);
          }),
          tap({
            error: (error) => {
              this.logger.warn(
                `Prisma operation failed after ${MAX_RETRIES} retries: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            },
          }),
        ),
      ),
      catchError((error) => {
        if (this.isTransientPrismaError(error)) {
          this.logger.error(
            `Transient Prisma error exhausted retries: ${error instanceof Error ? error.message : ''}`,
          );
        }
        return throwError(() => error);
      }),
    );
  }

  private isTransientPrismaError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return TRANSIENT_ERROR_CODES.has(error.code);
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }
    if (
      error instanceof Error &&
      (error.message.includes('Connection acquired') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT'))
    ) {
      return true;
    }
    return false;
  }
}

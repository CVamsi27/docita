import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  createNestLogLevelWriters,
  writeAppLog,
} from './logger-level.registry';

export interface LogContext {
  userId?: string;
  clinicId?: string;
  requestId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LoggerService {
  private logger = new Logger('AppLogger');
  private readonly levelWriters = createNestLogLevelWriters(this.logger);

  constructor(@Inject(CLOCK_PORT) private readonly clock: IClock) {}

  debug(message: string, context?: LogContext) {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('WARN', message, context);
  }

  error(message: string, error?: Error | string, context?: LogContext) {
    const errorMessage = error instanceof Error ? error.stack : String(error);
    this.log('ERROR', message, context, errorMessage);
  }

  private log(
    level: string,
    message: string,
    context?: LogContext,
    error?: string,
  ) {
    const logEntry = {
      timestamp: this.clock.now().toISOString(),
      level,
      message,
      ...(context && {
        userId: context.userId,
        clinicId: context.clinicId,
        requestId: context.requestId,
        action: context.action,
        metadata: context.metadata,
      }),
      ...(error && { error }),
    };

    writeAppLog(this.levelWriters, level, JSON.stringify(logEntry));
  }
}

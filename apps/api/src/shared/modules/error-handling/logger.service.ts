import { Injectable, Logger } from '@nestjs/common';

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
      timestamp: new Date().toISOString(),
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

    switch (level) {
      case 'DEBUG':
        this.logger.debug(JSON.stringify(logEntry));
        break;
      case 'INFO':
        this.logger.log(JSON.stringify(logEntry));
        break;
      case 'WARN':
        this.logger.warn(JSON.stringify(logEntry));
        break;
      case 'ERROR':
        this.logger.error(JSON.stringify(logEntry));
        break;
    }
  }
}

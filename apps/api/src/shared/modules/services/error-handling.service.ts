import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger('ErrorHandlingService');

  handlePaymentError(error: unknown, context: Record<string, unknown>): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Payment processing failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });

    throw new InternalServerErrorException(
      'Payment processing failed. Please try again or contact support.',
    );
  }

  handleImportError(error: unknown, context: Record<string, unknown>): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Data import failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });

    throw new InternalServerErrorException(
      'Data import failed. Please check your data and try again.',
    );
  }

  handleWebhookError(
    error: unknown,
    webhookType: string,
    payload: unknown,
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error(`${webhookType} webhook processing failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      webhookType,
      payloadPreview: this.sanitizePayload(payload),
    });

    throw new InternalServerErrorException(
      `${webhookType} webhook processing failed`,
    );
  }

  handleDatabaseError(
    error: unknown,
    operation: string,
    context: Record<string, unknown>,
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Database operation failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      operation,
      context,
    });

    if (errorMessage.includes('Unique constraint')) {
      throw new BadRequestException('Resource already exists');
    }

    throw new InternalServerErrorException('Database operation failed');
  }

  handleExternalServiceError(
    error: unknown,
    serviceName: string,
    endpoint: string,
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error(`${serviceName} service error`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      serviceName,
      endpoint,
    });

    throw new InternalServerErrorException(
      `Failed to reach ${serviceName}. Please try again later.`,
    );
  }

  logError(
    source: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error(`${source}: ${errorMessage}`, {
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });
  }

  private sanitizePayload(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') {
      return '[non-object payload]';
    }

    const stringPayload = JSON.stringify(payload);

    return stringPayload
      .replace(/"password":\s*"[^"]*"/g, '"password":"***"')
      .replace(/"token":\s*"[^"]*"/g, '"token":"***"')
      .replace(/"apiKey":\s*"[^"]*"/g, '"apiKey":"***"')
      .replace(/"secret":\s*"[^"]*"/g, '"secret":"***"')
      .substring(0, 500);
  }
}

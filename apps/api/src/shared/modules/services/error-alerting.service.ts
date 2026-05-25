import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class ErrorAlertingService {
  private readonly logger = new Logger(ErrorAlertingService.name);
  private alertThresholds = {
    criticalErrorRate: 0.05,
    consecutiveFailures: 3,
    responseTimeThreshold: 5000,
  };

  constructor(@Inject(CLOCK_PORT) private readonly clock: IClock) {}

  trackCriticalError(context: {
    errorType: string;
    service: string;
    userId?: string;
    clinicId?: string;
    message: string;
    stack?: string;
  }): void {
    this.logger.error(`Critical Error: ${context.errorType}`, {
      service: context.service,
      userId: context.userId,
      clinicId: context.clinicId,
      message: context.message,
      timestamp: this.clock.now().toISOString(),
    });

    const shouldEscalate = this.evaluateSeverity(context);
    if (shouldEscalate) {
      this.sendEscalationAlert(context);
    }
  }

  trackErrorRate(
    service: string,
    totalRequests: number,
    failedRequests: number,
  ): void {
    const errorRate = failedRequests / totalRequests;

    if (errorRate > this.alertThresholds.criticalErrorRate) {
      this.logger.warn(`High error rate detected: ${service}`, {
        service,
        errorRate: `${(errorRate * 100).toFixed(2)}%`,
        threshold: `${(this.alertThresholds.criticalErrorRate * 100).toFixed(2)}%`,
        totalRequests,
        failedRequests,
      });

      this.sendErrorRateAlert(service, errorRate);
    }
  }

  trackConsecutiveFailures(operation: string, failureCount: number): void {
    if (failureCount >= this.alertThresholds.consecutiveFailures) {
      this.logger.error(`Consecutive failures detected: ${operation}`, {
        operation,
        failureCount,
        threshold: this.alertThresholds.consecutiveFailures,
      });

      this.sendOperationFailureAlert(operation, failureCount);
    }
  }

  trackSlowOperation(context: {
    operation: string;
    duration: number;
    threshold?: number;
  }): void {
    const threshold =
      context.threshold || this.alertThresholds.responseTimeThreshold;

    if (context.duration > threshold) {
      this.logger.warn(`Slow operation detected: ${context.operation}`, {
        operation: context.operation,
        duration: `${context.duration}ms`,
        threshold: `${threshold}ms`,
      });

      this.sendPerformanceAlert(context.operation, context.duration);
    }
  }

  private evaluateSeverity(context: {
    errorType: string;
    service: string;
  }): boolean {
    const criticalServices = ['payments', 'auth', 'database', 'api-gateway'];
    const criticalErrorTypes = [
      'PaymentGatewayError',
      'DatabaseConnectionError',
      'AuthenticationFailure',
      'DataLossError',
    ];

    const isCriticalService = criticalServices.includes(context.service);
    const isCriticalError = criticalErrorTypes.includes(context.errorType);

    return isCriticalService || isCriticalError;
  }

  private sendEscalationAlert(context: Record<string, unknown>): void {
    this.logger.error('ESCALATION ALERT', {
      context,
      timestamp: this.clock.now().toISOString(),
    });
  }

  private sendErrorRateAlert(service: string, errorRate: number): void {
    this.logger.warn(`ERROR RATE ALERT: ${service}`, {
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
    });
  }

  private sendOperationFailureAlert(
    operation: string,
    failureCount: number,
  ): void {
    this.logger.error(`OPERATION FAILURE ALERT: ${operation}`, {
      failureCount,
    });
  }

  private sendPerformanceAlert(operation: string, duration: number): void {
    this.logger.warn(`PERFORMANCE ALERT: ${operation}`, {
      duration: `${duration}ms`,
    });
  }

  getAlertThresholds() {
    return { ...this.alertThresholds };
  }

  updateAlertThresholds(newThresholds: Partial<typeof this.alertThresholds>) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    this.logger.log('Alert thresholds updated', {
      thresholds: this.alertThresholds,
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';

/**
 * Error Alerting Service (CQ-2 Component)
 *
 * Handles critical error notifications and escalations
 */
@Injectable()
export class ErrorAlertingService {
  private readonly logger = new Logger(ErrorAlertingService.name);
  private alertThresholds = {
    criticalErrorRate: 0.05, // 5% error rate threshold
    consecutiveFailures: 3, // 3 failed attempts trigger alert
    responseTimeThreshold: 5000, // 5 seconds
  };

  constructor() {}

  /**
   * Register critical error occurrence
   */
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
      timestamp: new Date().toISOString(),
    });

    // In production, this would:
    // 1. Send Slack/PagerDuty alert
    // 2. Log to external monitoring (DataDog, Sentry, etc.)
    // 3. Create incident ticket if severity high
    // 4. Notify on-call engineer

    const shouldEscalate = this.evaluateSeverity(context);
    if (shouldEscalate) {
      this.sendEscalationAlert(context);
    }
  }

  /**
   * Track error rate for a service
   */
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

      // Trigger alert if exceeds threshold
      this.sendErrorRateAlert(service, errorRate);
    }
  }

  /**
   * Track consecutive operation failures
   */
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

  /**
   * Track slow operations
   */
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

  /**
   * Evaluate error severity for escalation
   */
  private evaluateSeverity(context: {
    errorType: string;
    service: string;
  }): boolean {
    // Critical services that require immediate attention
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

  /**
   * Send escalation alert (Slack, PagerDuty, etc.)
   */
  private sendEscalationAlert(context: Record<string, unknown>): void {
    // In production, implement actual alerting:
    // - Slack webhook
    // - PagerDuty incident creation
    // - Email notification
    // - SMS for critical severity

    this.logger.error('ESCALATION ALERT', {
      context,
      timestamp: new Date().toISOString(),
      // In production: await this.slackService.sendAlert(...)
      // In production: await this.pagerDutyService.createIncident(...)
    });
  }

  /**
   * Send error rate alert
   */
  private sendErrorRateAlert(service: string, errorRate: number): void {
    this.logger.warn(`ERROR RATE ALERT: ${service}`, {
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
    });
    // In production: await this.monitoringService.sendAlert(...)
  }

  /**
   * Send operation failure alert
   */
  private sendOperationFailureAlert(
    operation: string,
    failureCount: number,
  ): void {
    this.logger.error(`OPERATION FAILURE ALERT: ${operation}`, {
      failureCount,
    });
    // In production: await this.monitoringService.sendAlert(...)
  }

  /**
   * Send performance alert
   */
  private sendPerformanceAlert(operation: string, duration: number): void {
    this.logger.warn(`PERFORMANCE ALERT: ${operation}`, {
      duration: `${duration}ms`,
    });
    // In production: await this.monitoringService.sendAlert(...)
  }

  /**
   * Get alert configuration
   */
  getAlertThresholds() {
    return { ...this.alertThresholds };
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(newThresholds: Partial<typeof this.alertThresholds>) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    this.logger.log('Alert thresholds updated', {
      thresholds: this.alertThresholds,
    });
  }
}

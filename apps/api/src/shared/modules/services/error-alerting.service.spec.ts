import { ErrorAlertingService } from './error-alerting.service';
import { createFixedClockMock } from '@/test-utils';

describe('ErrorAlertingService', () => {
  let service: ErrorAlertingService;

  beforeEach(() => {
    service = new ErrorAlertingService(createFixedClockMock());
  });

  it('tracks critical errors without throwing', () => {
    expect(() =>
      service.trackCriticalError({
        errorType: 'PaymentGatewayError',
        service: 'payments',
        message: 'Payment gateway timeout',
        clinicId: 'clinic_1',
      }),
    ).not.toThrow();
  });

  it('tracks high error rates without throwing', () => {
    expect(() => service.trackErrorRate('billing', 100, 20)).not.toThrow();
  });

  it('tracks slow operations without throwing', () => {
    expect(() =>
      service.trackSlowOperation({
        operation: 'invoice.generate',
        duration: 7500,
      }),
    ).not.toThrow();
  });

  it('updates alert thresholds', () => {
    service.updateAlertThresholds({
      criticalErrorRate: 0.1,
      consecutiveFailures: 5,
    });

    const thresholds = service.getAlertThresholds();
    expect(thresholds.criticalErrorRate).toBe(0.1);
    expect(thresholds.consecutiveFailures).toBe(5);
  });
});

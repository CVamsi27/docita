import { LabTestOrderStatus } from '@workspace/db';
import { LabOrder } from './lab-order.entity';

const baseArgs = {
  patientId: 'patient-1',
  labTestId: 'test-1',
  clinicId: 'clinic-1',
} as const;

function buildOrder(overrides: {
  status?: LabTestOrderStatus;
  resultUrl?: string;
  paidAt?: Date;
}): LabOrder {
  return new LabOrder(
    'order-1',
    baseArgs.patientId,
    baseArgs.labTestId,
    overrides.status ?? LabTestOrderStatus.RESULT_READY,
    baseArgs.clinicId,
    undefined,
    undefined,
    overrides.resultUrl,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    overrides.paidAt,
  );
}

describe('LabOrder.canRelease', () => {
  it('allows release when a result is uploaded and payment is verified', () => {
    const order = buildOrder({
      status: LabTestOrderStatus.RESULT_READY,
      resultUrl: 'lab-results/report.pdf',
      paidAt: new Date('2026-06-05T10:00:00Z'),
    });
    expect(order.canRelease()).toBe(true);
  });

  it('blocks release when payment has not been verified', () => {
    const order = buildOrder({
      status: LabTestOrderStatus.RESULT_READY,
      resultUrl: 'lab-results/report.pdf',
      paidAt: undefined,
    });
    expect(order.isPaid()).toBe(false);
    expect(order.canRelease()).toBe(false);
  });

  it('blocks release when no result has been uploaded', () => {
    const order = buildOrder({
      status: LabTestOrderStatus.SAMPLE_COLLECTED,
      resultUrl: undefined,
      paidAt: new Date('2026-06-05T10:00:00Z'),
    });
    expect(order.hasResult()).toBe(false);
    expect(order.canRelease()).toBe(false);
  });

  it('blocks re-release of an already completed order', () => {
    const order = buildOrder({
      status: LabTestOrderStatus.COMPLETED,
      resultUrl: 'lab-results/report.pdf',
      paidAt: new Date('2026-06-05T10:00:00Z'),
    });
    expect(order.isTerminal()).toBe(true);
    expect(order.canRelease()).toBe(false);
  });

  it('blocks release for a cancelled order', () => {
    const order = buildOrder({
      status: LabTestOrderStatus.CANCELLED,
      resultUrl: 'lab-results/report.pdf',
      paidAt: new Date('2026-06-05T10:00:00Z'),
    });
    expect(order.canRelease()).toBe(false);
  });
});

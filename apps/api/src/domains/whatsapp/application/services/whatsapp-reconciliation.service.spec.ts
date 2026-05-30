import { Logger } from '@nestjs/common';
import { WhatsappLogStatus } from '@workspace/db';
import { WhatsappReconciliationService } from './whatsapp-reconciliation.service';
import type {
  IWhatsappReconciliationRepository,
  StaleWhatsappLogGroup,
} from '@/domains/whatsapp/core/repositories/whatsapp-reconciliation.repository.interface';
import { createFixedClockMock } from '@/test-utils/fixed-clock.mock';

describe('WhatsappReconciliationService', () => {
  const NOW = '2026-01-15T12:00:00.000Z';

  function setup(groups: StaleWhatsappLogGroup[]) {
    const findStaleNonFinal = jest.fn().mockResolvedValue(groups);
    const repository: IWhatsappReconciliationRepository = { findStaleNonFinal };
    const service = new WhatsappReconciliationService(
      repository,
      createFixedClockMock(NOW),
    );
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    return { service, findStaleNonFinal, warn };
  }

  afterEach(() => jest.restoreAllMocks());

  it('queries logs older than the 6h staleness window', async () => {
    const { service, findStaleNonFinal } = setup([]);

    await service.runStaleDeliverySweep();

    expect(findStaleNonFinal).toHaveBeenCalledTimes(1);
    const cutoff = findStaleNonFinal.mock.calls[0][0] as Date;
    // 6 hours before the fixed "now" of 12:00:00Z.
    expect(cutoff.toISOString()).toBe('2026-01-15T06:00:00.000Z');
  });

  it('stays silent (no warning) when nothing is stale', async () => {
    const { service, warn } = setup([]);

    await service.runStaleDeliverySweep();

    expect(warn).not.toHaveBeenCalled();
  });

  it('warns with an aggregate count when stale logs exist, without mutating', async () => {
    const { service, warn } = setup([
      {
        clinicId: 'clinic-a',
        status: WhatsappLogStatus.SENT,
        count: 3,
        oldestCreatedAt: new Date('2026-01-15T03:00:00.000Z'),
      },
      {
        clinicId: 'clinic-b',
        status: WhatsappLogStatus.QUEUED,
        count: 2,
        oldestCreatedAt: new Date('2026-01-15T02:00:00.000Z'),
      },
    ]);

    await service.runStaleDeliverySweep();

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0] as string;
    expect(message).toContain('5 outbound message(s)');
    expect(message).toContain('clinic=clinic-a');
    expect(message).toContain('clinic=clinic-b');
  });
});

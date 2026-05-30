import { Logger } from '@nestjs/common';
import { UsageTrackingCommandService } from './usage-tracking-command.service';
import type { PrismaService } from '@/prisma/prisma.service';

function createService() {
  return new UsageTrackingCommandService({} as unknown as PrismaService);
}

describe('UsageTrackingCommandService — AI_CREDITS_CONSUMED handler', () => {
  afterEach(() => jest.restoreAllMocks());

  it('delegates the event payload to trackAICredits', async () => {
    const service = createService();
    const spy = jest
      .spyOn(service, 'trackAICredits')
      .mockResolvedValue(undefined);

    await service.handleAiCreditsConsumed({
      clinicId: 'clinic-1',
      feature: 'prescriptionSuggestion',
      entityId: 'rx-1',
    });

    expect(spy).toHaveBeenCalledWith(
      'clinic-1',
      'prescriptionSuggestion',
      'rx-1',
    );
  });

  it('swallows tracking errors so the listener never throws', async () => {
    const service = createService();
    jest
      .spyOn(service, 'trackAICredits')
      .mockRejectedValue(new Error('db down'));
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      service.handleAiCreditsConsumed({
        clinicId: 'clinic-1',
        feature: 'codingSuggestion',
      }),
    ).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalled();
  });
});

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { PARTNER_PERSISTENCE_PORT } from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { FacilityLeadNotificationService } from './facility-lead-notification.service';
import { leadRow, makeFacilityLeadCtx } from './facility-lead.spec-helpers';

describe('FacilityLeadNotificationService durable event subscription', () => {
  let app: INestApplication;
  let events: EventEmitter2;
  let ctx: ReturnType<typeof makeFacilityLeadCtx>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    ctx = makeFacilityLeadCtx();
    ctx.facilityLead.findUnique.mockResolvedValue(
      leadRow({ referrer: { id: 'r1', name: 'Synthetic Partner' } }),
    );
    ctx.facilityLeadNotification.upsert.mockResolvedValue({
      id: 'notification-1',
    });
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        FacilityLeadNotificationService,
        { provide: PARTNER_PERSISTENCE_PORT, useValue: ctx.prisma },
        { provide: CLOCK_PORT, useValue: ctx.clock },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    events = app.get(EventEmitter2);
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it.each([
    ApplicationEvents.FACILITY_LEAD_CREATED,
    ApplicationEvents.FACILITY_LEAD_CONVERTED,
  ])(
    'waits for the actual %s subscriber to persist its notification',
    async (eventName) => {
      let release: () => void = () => undefined;
      let signalStarted: () => void = () => undefined;
      const started = new Promise<void>((resolve) => {
        signalStarted = resolve;
      });
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      ctx.facilityLeadNotification.upsert.mockImplementationOnce(async () => {
        signalStarted();
        await pending;
        return { id: 'notification-1' };
      });
      let settled = false;
      const emitted = events.emitAsync(eventName, { leadId: 'l1' }).then(() => {
        settled = true;
      });
      await started;
      const settledBeforeWrite = settled;
      release();
      await emitted;
      expect(settledBeforeWrite).toBe(false);
    },
  );

  it('propagates a failed delivery and permits a successful idempotent retry', async () => {
    const error = new Error('synthetic transient failure');
    ctx.facilityLead.findUnique.mockRejectedValueOnce(error);
    await expect(
      events.emitAsync(ApplicationEvents.FACILITY_LEAD_CREATED, {
        leadId: 'l1',
      }),
    ).rejects.toBe(error);
    expect(ctx.facilityLeadNotification.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    await events.emitAsync(ApplicationEvents.FACILITY_LEAD_CREATED, {
      leadId: 'l1',
    });
    expect(ctx.facilityLeadNotification.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { leadId_kind: { leadId: 'l1', kind: 'LEAD_CREATED' } },
        update: expect.objectContaining({
          status: 'DELIVERED',
          errorMessage: null,
        }),
      }),
    );
  });
});

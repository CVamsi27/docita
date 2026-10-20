import { EventEmitter2 } from '@nestjs/event-emitter';
import { OpsAlertListener } from './ops-alert.listener';
import type { OpsAlertService } from '@/shared/modules/monitoring/monitoring/services/ops-alert.service';
import { ApplicationEvents } from '@/shared/common/events/application-events';

type NotifyArg = Parameters<OpsAlertService['notify']>[0];

describe('OpsAlertListener', () => {
  let events: EventEmitter2;
  let notify: jest.Mock<Promise<void>, [NotifyArg]>;
  let listener: OpsAlertListener;

  beforeEach(() => {
    events = new EventEmitter2();
    notify = jest.fn().mockResolvedValue(undefined);
    listener = new OpsAlertListener({
      notify,
    } as unknown as OpsAlertService);

    // Registered through the same @OnEvent metadata the Nest module reads, so a
    // renamed event constant on either side breaks these tests rather than only
    // surfacing as a missing page during saturation.
    for (const handler of [
      listener.handleWhatsappDeliveryStale,
      listener.handlePoolSaturationSustained,
    ]) {
      const metadata = Reflect.getMetadata(
        'EVENT_LISTENER_METADATA',
        handler,
      ) as Array<{ event: string }> | undefined;
      for (const entry of metadata ?? []) {
        events.on(entry.event, handler.bind(listener));
      }
    }
  });

  it('registers a handler for every declared ops-alert event', () => {
    expect(events.eventNames()).toEqual(
      expect.arrayContaining([
        ApplicationEvents.WHATSAPP_DELIVERY_STALE,
        ApplicationEvents.POOL_SATURATION_SUSTAINED,
      ]),
    );
  });

  it('warns with the stale backlog counts', async () => {
    await events.emitAsync(ApplicationEvents.WHATSAPP_DELIVERY_STALE, {
      totalStale: 12,
      groupCount: 3,
    });

    expect(notify).toHaveBeenCalledTimes(1);
    const arg = notify.mock.calls[0][0];
    expect(arg.severity).toBe('warn');
    expect(arg.tags).toMatchObject({
      totalStale: 12,
      groupCount: 3,
      source: 'whatsapp-reconciliation',
    });
  });

  it('pages when callers are queued for a connection', async () => {
    await events.emitAsync(ApplicationEvents.POOL_SATURATION_SUSTAINED, {
      queuedForMs: 60_000,
      waiting: 5,
      total: 15,
      max: 15,
    });

    expect(notify).toHaveBeenCalledTimes(1);
    const arg = notify.mock.calls[0][0];
    expect(arg.severity).toBe('page');
    expect(arg.tags).toMatchObject({
      queuedForMs: 60_000,
      waiting: 5,
      total: 15,
      max: 15,
      source: 'pool-saturation',
    });
  });

  it('names the connection queue rather than the database in the page text', async () => {
    // The operator-facing distinction is the whole point of paging here: a
    // larger database is the wrong lever, a larger pool is the right one.
    await events.emitAsync(ApplicationEvents.POOL_SATURATION_SUSTAINED, {
      queuedForMs: 45_000,
      waiting: 2,
      total: 10,
      max: 10,
    });

    const arg = notify.mock.calls[0][0];
    expect(arg.text).toContain('45000ms');
    expect(arg.text).toContain('waiting=2');
    expect(arg.text).toContain('not for the database');
  });
});

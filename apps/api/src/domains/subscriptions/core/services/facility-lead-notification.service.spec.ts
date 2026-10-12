import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { FacilityLeadNotificationService } from './facility-lead-notification.service';
import { leadRow, makeFacilityLeadCtx } from './facility-lead.spec-helpers';

describe('FacilityLeadNotificationService', () => {
  let ctx: ReturnType<typeof makeFacilityLeadCtx>;
  beforeEach(() => {
    ctx = makeFacilityLeadCtx();
  });

  const service = () =>
    new FacilityLeadNotificationService(ctx.prisma, ctx.clock);

  it('listens to the created and converted outbox events', () => {
    const prototype = FacilityLeadNotificationService.prototype as unknown as {
      onLeadCreated?: unknown;
      onLeadConverted?: unknown;
    };
    expect(typeof prototype.onLeadCreated).toBe('function');
    expect(typeof prototype.onLeadConverted).toBe('function');
  });

  it('materializes a DELIVERED notification with the PII-redacted payload', async () => {
    ctx.facilityLead.findUnique.mockResolvedValue(
      leadRow({ referrer: { id: 'r1', name: 'Priya Partner' } }),
    );
    ctx.facilityLeadNotification.upsert.mockResolvedValue({ id: 'n1' });

    await service().onLeadCreated({ leadId: 'l1' });

    const arg = ctx.facilityLeadNotification.upsert.mock.calls[0]?.[0] as {
      where: { leadId_kind: { leadId: string; kind: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(arg.where.leadId_kind).toEqual({
      leadId: 'l1',
      kind: 'LEAD_CREATED',
    });
    expect(arg.create.status).toBe('DELIVERED');
    expect(arg.create.channel).toBe('internal');
    // Untargeted while the lead sits in the shared triage queue.
    expect(arg.create.recipientUserId).toBeNull();
    // Payload must not carry contact phone/email.
    const payload = arg.create.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      leadId: 'l1',
      facilityName: 'Sunrise Diagnostics',
      city: 'Bengaluru',
      partnerName: 'Priya Partner',
      consentToFollowUp: true,
      duplicateScore: null,
      // Per-lead deep link into the queue.
      deepLink: '/leads?lead=l1',
    });
    expect(payload.contactPhone).toBeUndefined();
    expect(payload.contactEmail).toBeUndefined();
    expect(typeof arg.create.deliveredAt).not.toBe('undefined');
  });

  it('records FAILED and rejects so the outbox can retry a failed lead load', async () => {
    ctx.facilityLead.findUnique.mockRejectedValue(
      new Error('connection refused'),
    );
    ctx.facilityLeadNotification.upsert.mockResolvedValue({ id: 'n1' });

    await expect(service().onLeadCreated({ leadId: 'l1' })).rejects.toThrow(
      'connection refused',
    );

    const arg = ctx.facilityLeadNotification.upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
    };
    expect(arg.create.status).toBe('FAILED');
    expect(arg.create.errorMessage).toBe('connection refused');
  });

  it('carries the duplicate score for review-flagged leads', async () => {
    ctx.facilityLead.findUnique.mockResolvedValue(
      leadRow({ duplicateScore: 1 }),
    );
    ctx.facilityLeadNotification.upsert.mockResolvedValue({ id: 'n1' });

    await service().onLeadCreated({ leadId: 'l1' });

    const arg = ctx.facilityLeadNotification.upsert.mock.calls[0]?.[0] as {
      create: { payload: Record<string, unknown> };
    };
    expect(arg.create.payload.duplicateScore).toBe(1);
  });

  it('targets the assigned owner when the lead has one', async () => {
    ctx.facilityLead.findUnique.mockResolvedValue(
      leadRow({
        ownerUserId: 'op-1',
        ownerUser: { id: 'op-1', name: 'Kiran Ops' },
      }),
    );
    ctx.facilityLeadNotification.upsert.mockResolvedValue({ id: 'n1' });

    await service().onLeadCreated({ leadId: 'l1' });

    const arg = ctx.facilityLeadNotification.upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(arg.create.recipientUserId).toBe('op-1');
    expect(arg.update.recipientUserId).toBe('op-1');
  });

  it('skips silently when the lead no longer exists', async () => {
    ctx.facilityLead.findUnique.mockResolvedValue(null);

    await service().onLeadConverted({ leadId: 'gone' });

    expect(ctx.facilityLeadNotification.upsert).not.toHaveBeenCalled();
  });
});

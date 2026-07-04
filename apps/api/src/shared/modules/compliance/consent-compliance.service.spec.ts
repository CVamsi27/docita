import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConsentComplianceService } from './consent-compliance.service';

function makeCtx() {
  const consent = {
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    update: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const patient = {
    updateMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const prisma = { consent, patient } as never;
  const dpdpAudit = {
    logConsentRecorded: jest.fn(async () => undefined),
    logConsentWithdrawn: jest.fn(async () => undefined),
  } as never;
  const clock = { now: () => new Date('2026-07-03T00:00:00Z') } as never;
  return {
    service: new ConsentComplianceService(prisma, dpdpAudit, clock),
    consent,
    patient,
  };
}

describe('ConsentComplianceService.setMarketingConsent', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('records a MARKETING consent when granted and none is active', async () => {
    ctx.consent.findFirst.mockResolvedValue(null);
    ctx.consent.create.mockResolvedValue({ id: 'm1' });

    const result = await ctx.service.setMarketingConsent({
      patientId: 'p1',
      clinicId: 'c1',
      granted: true,
    });

    expect(result).toEqual({ active: true });
    const data = (
      ctx.consent.create.mock.calls[0][0] as {
        data: { consentType: string };
      }
    ).data;
    expect(data.consentType).toBe('MARKETING');
  });

  it('does not duplicate when marketing consent is already active', async () => {
    ctx.consent.findFirst.mockResolvedValue({ id: 'm1' });

    const result = await ctx.service.setMarketingConsent({
      patientId: 'p1',
      clinicId: 'c1',
      granted: true,
    });

    expect(result).toEqual({ active: true });
    expect(ctx.consent.create).not.toHaveBeenCalled();
  });

  it('withdraws and clears the WhatsApp opt-in when revoked', async () => {
    ctx.consent.findFirst
      .mockResolvedValueOnce({ id: 'm1' }) // setMarketingConsent existence
      .mockResolvedValueOnce({ id: 'm1', clinicId: 'c1' }); // withdrawConsent check
    ctx.consent.update.mockResolvedValue({
      id: 'm1',
      consentType: 'MARKETING',
      patientId: 'p1',
      clinicId: 'c1',
    });

    const result = await ctx.service.setMarketingConsent({
      patientId: 'p1',
      clinicId: 'c1',
      granted: false,
    });

    expect(result).toEqual({ active: false });
    expect(ctx.patient.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', clinicId: 'c1' },
      data: { whatsappConsent: false, whatsappConsentAt: null },
    });
  });

  it('is a no-op when revoking with no active consent', async () => {
    ctx.consent.findFirst.mockResolvedValue(null);

    const result = await ctx.service.setMarketingConsent({
      patientId: 'p1',
      clinicId: 'c1',
      granted: false,
    });

    expect(result).toEqual({ active: false });
    expect(ctx.consent.update).not.toHaveBeenCalled();
  });
});

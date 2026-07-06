import { describe, expect, it, jest } from '@jest/globals';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';
import { isClinicWhatsAppAutomationSendingAllowed } from './whatsapp-patient-send-policy.util';
import type { PrismaService } from '@/prisma/prisma.service';

type Reader = Pick<PrismaService, 'clinic'>;

function readerReturning(row: unknown): Reader {
  return {
    clinic: { findUnique: jest.fn(async () => row) },
  } as unknown as Reader;
}

const enabledClinic = (whatsappAutomation: unknown) => ({
  tier: ClinicTier.PROFESSIONAL,
  intelligenceAddon: IntelligenceAddon.NONE,
  features: {},
  whatsappAutomation,
});

describe('isClinicWhatsAppAutomationSendingAllowed', () => {
  it('denies when the clinic does not exist', async () => {
    await expect(
      isClinicWhatsAppAutomationSendingAllowed(readerReturning(null), 'c-1'),
    ).resolves.toBe(false);
  });

  it('denies when the tier lacks WhatsApp messaging', async () => {
    const reader = readerReturning({
      tier: ClinicTier.STARTER,
      intelligenceAddon: IntelligenceAddon.NONE,
      features: {},
      whatsappAutomation: null,
    });
    await expect(
      isClinicWhatsAppAutomationSendingAllowed(reader, 'c-1'),
    ).resolves.toBe(false);
  });

  it('allows an eligible tier when automation config is absent', async () => {
    await expect(
      isClinicWhatsAppAutomationSendingAllowed(
        readerReturning(enabledClinic(null)),
        'c-1',
      ),
    ).resolves.toBe(true);
  });

  it('allows when automation is explicitly enabled', async () => {
    await expect(
      isClinicWhatsAppAutomationSendingAllowed(
        readerReturning(enabledClinic({ enabled: true })),
        'c-1',
      ),
    ).resolves.toBe(true);
  });

  it('allows when the automation object omits the enabled flag', async () => {
    await expect(
      isClinicWhatsAppAutomationSendingAllowed(
        readerReturning(enabledClinic({})),
        'c-1',
      ),
    ).resolves.toBe(true);
  });

  it('denies when the clinic has opted out of automation', async () => {
    await expect(
      isClinicWhatsAppAutomationSendingAllowed(
        readerReturning(enabledClinic({ enabled: false })),
        'c-1',
      ),
    ).resolves.toBe(false);
  });
});

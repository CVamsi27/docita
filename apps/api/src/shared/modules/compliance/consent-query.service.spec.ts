import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConsentType } from '@workspace/db';
import { ConsentQueryService } from './consent-query.service';
import type { PrismaService } from '@/prisma/prisma.service';

describe('ConsentQueryService', () => {
  const NOW = new Date('2026-08-11T00:00:00.000Z');

  const consentFindFirst = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const consentFindMany = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const clinicFindUnique = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const patientFindUnique = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const prisma = {
    consent: { findFirst: consentFindFirst, findMany: consentFindMany },
    clinic: { findUnique: clinicFindUnique },
    patient: { findUnique: patientFindUnique },
  } as unknown as PrismaService;

  const clock = { now: () => NOW };

  let service: ConsentQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConsentQueryService(prisma, clock);
  });

  describe('hasValidConsent', () => {
    it('returns true when an active consent row exists with no expiry', async () => {
      consentFindFirst.mockResolvedValue({ id: 'c-1' });
      const result = await service.hasValidConsent('pat-1', 'clinic-1', ConsentType.MARKETING);
      expect(result).toBe(true);
      expect(consentFindFirst).toHaveBeenCalledTimes(1);
    });

    it('returns false when no consent row is found', async () => {
      consentFindFirst.mockResolvedValue(null);
      const result = await service.hasValidConsent('pat-1', 'clinic-1', ConsentType.MARKETING);
      expect(result).toBe(false);
    });

    it('uses the OR clause to allow null OR future validUntil', async () => {
      consentFindFirst.mockResolvedValue({ id: 'c-2' });
      await service.hasValidConsent('pat-1', 'clinic-1', ConsentType.DPDP_NOTICE);
      const where = (consentFindFirst.mock.calls[0]?.[0] as { where: unknown })?.where as {
        OR: unknown[];
      };
      expect(where.OR).toEqual([
        { validUntil: null },
        { validUntil: { gte: NOW } },
      ]);
    });
  });

  describe('getConsentHistory', () => {
    it('returns rows sorted by createdAt desc', async () => {
      consentFindMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
      const out = await service.getConsentHistory('pat-1', 'clinic-1');
      expect(out).toHaveLength(2);
      expect(consentFindMany).toHaveBeenCalledWith({
        where: { patientId: 'pat-1', clinicId: 'clinic-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('validateWhatsAppConsent', () => {
    it('returns true when the clinic has no requireConsentBeforeSending flag', async () => {
      clinicFindUnique.mockResolvedValue({ whatsappAutomation: null });
      const result = await service.validateWhatsAppConsent('pat-1', 'clinic-1');
      expect(result).toBe(true);
      expect(patientFindUnique).not.toHaveBeenCalled();
    });

    it('returns true when the clinic requires consent and the patient has opted in', async () => {
      clinicFindUnique.mockResolvedValue({ whatsappAutomation: { requireConsentBeforeSending: true } });
      patientFindUnique.mockResolvedValue({ whatsappConsent: true, whatsappConsentAt: NOW });
      const result = await service.validateWhatsAppConsent('pat-1', 'clinic-1');
      expect(result).toBe(true);
    });

    it('returns false when the clinic requires consent and the patient has not opted in', async () => {
      clinicFindUnique.mockResolvedValue({ whatsappAutomation: { requireConsentBeforeSending: true } });
      patientFindUnique.mockResolvedValue({ whatsappConsent: false, whatsappConsentAt: null });
      const result = await service.validateWhatsAppConsent('pat-1', 'clinic-1');
      expect(result).toBe(false);
    });
  });
});

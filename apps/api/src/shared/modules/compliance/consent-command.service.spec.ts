import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConsentStatus, ConsentType } from '@workspace/db';
import { ConsentCommandService } from './consent-command.service';
import type { PrismaService } from '@/prisma/prisma.service';
import type { DpdpAuditEmitter } from './dpdp-audit.emitter';

describe('ConsentCommandService', () => {
  const NOW = new Date('2026-08-11T00:00:00.000Z');

  const consentCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const consentFindFirst = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const consentUpdate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const patientUpdateMany = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const prisma = {
    consent: {
      create: consentCreate,
      findFirst: consentFindFirst,
      update: consentUpdate,
    },
    patient: { updateMany: patientUpdateMany },
  } as unknown as PrismaService;

  const logConsentRecorded =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const logConsentWithdrawn =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const dpdpAudit = {
    logConsentRecorded,
    logConsentWithdrawn,
  } as unknown as DpdpAuditEmitter;

  const clock = { now: () => NOW };

  let service: ConsentCommandService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConsentCommandService(prisma, dpdpAudit, clock);
  });

  describe('recordConsent', () => {
    it('creates the consent row and audits the action', async () => {
      consentCreate.mockResolvedValue({ id: 'c-1' });
      await service.recordConsent({
        patientId: 'pat-1',
        clinicId: 'clinic-1',
        consentType: ConsentType.MARKETING,
        status: ConsentStatus.ACTIVE,
        purpose: 'MARKETING',
        givenBy: 'Patient',
      });
      expect(consentCreate).toHaveBeenCalledTimes(1);
      expect(logConsentRecorded).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordDpdpNoticeConsent', () => {
    it('creates the notice consent with the supplied notice version', async () => {
      consentCreate.mockResolvedValue({ id: 'c-2' });
      const out = await service.recordDpdpNoticeConsent({
        patientId: 'pat-1',
        clinicId: 'clinic-1',
        givenByName: 'Patient',
        givenByRelation: 'self',
        noticeVersion: 'v3',
        ipAddress: '127.0.0.1',
        createdBy: 'user-1',
      });
      expect(out.id).toBe('c-2');
      expect(consentCreate).toHaveBeenCalledTimes(1);
      expect(logConsentRecorded).toHaveBeenCalledTimes(1);
    });
  });

  describe('withdrawConsent', () => {
    it('updates the consent and cascades to patient WhatsApp opt-in for DPDP_NOTICE', async () => {
      consentFindFirst.mockResolvedValue({
        id: 'c-3',
        clinicId: 'clinic-1',
        patientId: 'pat-1',
      });
      consentUpdate.mockResolvedValue({
        id: 'c-3',
        consentType: ConsentType.DPDP_NOTICE,
        patientId: 'pat-1',
        clinicId: 'clinic-1',
      });
      await service.withdrawConsent(
        'c-3',
        'user request',
        'user-1',
        '127.0.0.1',
        'clinic-1',
        'user-1',
      );
      expect(consentUpdate).toHaveBeenCalledTimes(1);
      expect(patientUpdateMany).toHaveBeenCalledWith({
        where: { id: 'pat-1', clinicId: 'clinic-1' },
        data: { whatsappConsent: false, whatsappConsentAt: null },
      });
      expect(logConsentWithdrawn).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when scoped to a clinic and not found', async () => {
      consentFindFirst.mockResolvedValue(null);
      await expect(
        service.withdrawConsent(
          'missing',
          'reason',
          'user-1',
          undefined,
          'clinic-1',
        ),
      ).rejects.toThrow(/Consent record not found/);
    });

    it('skips the scope check when no clinicId is provided', async () => {
      consentUpdate.mockResolvedValue({
        id: 'c-4',
        consentType: ConsentType.MARKETING,
      });
      await service.withdrawConsent('c-4', 'reason', 'user-1');
      expect(consentFindFirst).not.toHaveBeenCalled();
      expect(consentUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('setMarketingConsent', () => {
    it('records a fresh MARKETING consent when none exists', async () => {
      consentFindFirst.mockResolvedValue(null);
      consentCreate.mockResolvedValue({ id: 'c-5' });
      const out = await service.setMarketingConsent({
        patientId: 'pat-1',
        clinicId: 'clinic-1',
        granted: true,
        givenByName: 'Patient',
      });
      expect(out.active).toBe(true);
      expect(consentCreate).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when grant is true and an active consent already exists', async () => {
      consentFindFirst.mockResolvedValue({ id: 'c-6' });
      const out = await service.setMarketingConsent({
        patientId: 'pat-1',
        clinicId: 'clinic-1',
        granted: true,
      });
      expect(out.active).toBe(true);
      expect(consentCreate).not.toHaveBeenCalled();
    });

    it('withdraws the existing consent when grant is false', async () => {
      consentFindFirst.mockResolvedValue({ id: 'c-7' });
      consentUpdate.mockResolvedValue({
        id: 'c-7',
        consentType: ConsentType.MARKETING,
      });
      const out = await service.setMarketingConsent({
        patientId: 'pat-1',
        clinicId: 'clinic-1',
        granted: false,
      });
      expect(out.active).toBe(false);
      expect(consentUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('setDpdpNoticeConsent', () => {
    it('records a fresh notice consent when none exists', async () => {
      consentFindFirst.mockResolvedValue(null);
      consentCreate.mockResolvedValue({ id: 'c-8' });
      const out = await service.setDpdpNoticeConsent({
        patientId: 'pat-1',
        clinicId: 'clinic-1',
        granted: true,
        noticeVersion: 'v3',
      });
      expect(out.active).toBe(true);
      expect(consentCreate).toHaveBeenCalledTimes(1);
    });
  });
});

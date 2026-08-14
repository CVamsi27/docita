import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { ClinicReferralController } from './clinic-referral.controller';
import {
  CLINIC_REFERRAL_APP_SERVICE,
  type IClinicReferralAppService,
} from '../../application/ports/clinic-referral-app.port';
import type { RequestWithUser } from '@/shared/common/types/common.types';

function makeReq(clinicId: string | null): RequestWithUser {
  return {
    user: clinicId ? { clinicId, id: 'user_1' } : undefined,
  } as unknown as RequestWithUser;
}

describe('ClinicReferralController', () => {
  let controller: ClinicReferralController;
  let referralService: jest.Mocked<IClinicReferralAppService>;

  beforeEach(() => {
    referralService = {
      getClinicReferralStatus: jest.fn(),
      applyReferralCodeAtSettings: jest.fn(),
    } as unknown as jest.Mocked<IClinicReferralAppService>;
    controller = new ClinicReferralController(referralService);
  });

  describe('getStatus', () => {
    it('returns the status from the port', async () => {
      referralService.getClinicReferralStatus.mockResolvedValueOnce({
        code: 'RFR-AB23CD',
        source: 'PARTNER',
        status: 'SIGNED_UP',
        discountApplied: false,
      });
      const result = await controller.getStatus(makeReq('clinic_1'));
      expect(result).toEqual({
        code: 'RFR-AB23CD',
        source: 'PARTNER',
        status: 'SIGNED_UP',
        discountApplied: false,
      });
      expect(referralService.getClinicReferralStatus).toHaveBeenCalledWith(
        'clinic_1',
      );
    });

    it('throws Forbidden when the request has no clinicId', async () => {
      await expect(controller.getStatus(makeReq(null))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('apply', () => {
    it('forwards a well-formed code to the port and returns the success payload', async () => {
      referralService.applyReferralCodeAtSettings.mockResolvedValueOnce({
        applied: true,
        source: 'PARTNER',
        referrerId: 'rfr_1',
        clinicId: 'clinic_1',
      });
      const result = await controller.apply(makeReq('clinic_1'), {
        code: 'RFR-AB23CD',
      });
      expect(result.applied).toBe(true);
      expect(result.source).toBe('PARTNER');
      expect(result.referrerId).toBe('rfr_1');
      expect(result.clinicId).toBe('clinic_1');
      expect(result.message).toMatch(/discount/i);
      expect(referralService.applyReferralCodeAtSettings).toHaveBeenCalledWith(
        'clinic_1',
        'RFR-AB23CD',
      );
    });

    it('returns a friendly ALREADY_LINKED message without calling the port', async () => {
      referralService.applyReferralCodeAtSettings.mockResolvedValueOnce({
        applied: false,
        reason: 'ALREADY_LINKED',
      });
      const result = await controller.apply(makeReq('clinic_1'), {
        code: 'RFR-AB23CD',
      });
      expect(result).toEqual({
        applied: false,
        message: 'This clinic already has a referral code applied.',
      });
    });

    it('returns a friendly SELF message', async () => {
      referralService.applyReferralCodeAtSettings.mockResolvedValueOnce({
        applied: false,
        reason: 'SELF',
      });
      const result = await controller.apply(makeReq('clinic_1'), {
        code: 'RFR-AB23CD',
      });
      expect(result).toEqual({
        applied: false,
        message: 'You cannot refer yourself.',
      });
    });

    it('returns a generic INVALID message for unknown failure reasons', async () => {
      referralService.applyReferralCodeAtSettings.mockResolvedValueOnce({
        applied: false,
        reason: 'INVALID',
      });
      const result = await controller.apply(makeReq('clinic_1'), {
        code: 'RFR-AB23CD',
      });
      expect(result).toEqual({
        applied: false,
        message: 'Invalid referral code.',
      });
    });

    it('rejects a malformed body before calling the port', async () => {
      const result = await controller.apply(makeReq('clinic_1'), {
        // 100 chars — over the schema's 40-char cap.
        code: 'X'.repeat(100),
      });
      expect(result).toEqual({
        applied: false,
        message: 'Invalid referral code format',
      });
      expect(
        referralService.applyReferralCodeAtSettings,
      ).not.toHaveBeenCalled();
    });

    it('throws Forbidden when the request has no clinicId', async () => {
      await expect(
        controller.apply(makeReq(null), { code: 'RFR-AB23CD' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('CLINIC_REFERRAL_APP_SERVICE token', () => {
    it('matches the value bound in the clinics module', () => {
      expect(typeof CLINIC_REFERRAL_APP_SERVICE).toBe('string');
      expect(CLINIC_REFERRAL_APP_SERVICE).toBe('IClinicReferralAppService');
    });
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicReferralAdapter } from './clinic-referral.adapter';
import { ReferralService } from '../../core/services/referral.service';
import type { ClinicReferralStatus } from '@workspace/types';
import type { ApplyReferralCodeResult } from '@workspace/types';

describe('ClinicReferralAdapter', () => {
  let adapter: ClinicReferralAdapter;
  let referralService: jest.Mocked<
    Pick<
      ReferralService,
      'getClinicReferralStatus' | 'applyReferralCodeAtSettings'
    >
  >;

  beforeEach(() => {
    referralService = {
      getClinicReferralStatus: jest.fn(),
      applyReferralCodeAtSettings: jest.fn(),
    };
    adapter = new ClinicReferralAdapter(
      referralService as unknown as ReferralService,
    );
  });

  describe('getClinicReferralStatus', () => {
    it('forwards the call and returns the same object', async () => {
      const status: ClinicReferralStatus = {
        code: 'RFR-AB23CD',
        source: 'PARTNER',
        status: 'SIGNED_UP',
        discountApplied: false,
      };
      referralService.getClinicReferralStatus.mockResolvedValueOnce(status);
      const result = await adapter.getClinicReferralStatus('clinic_1');
      expect(result).toBe(status);
      expect(referralService.getClinicReferralStatus).toHaveBeenCalledWith(
        'clinic_1',
      );
    });

    it('propagates a NotFound from the underlying service', async () => {
      referralService.getClinicReferralStatus.mockRejectedValueOnce(
        new Error('Referrer not found'),
      );
      await expect(adapter.getClinicReferralStatus('clinic_1')).rejects.toThrow(
        'Referrer not found',
      );
    });
  });

  describe('applyReferralCodeAtSettings', () => {
    it('forwards the call and returns the same object', async () => {
      const outcome: ApplyReferralCodeResult = {
        applied: true,
        source: 'PARTNER',
        referrerId: 'rfr_1',
        clinicId: 'clinic_1',
      };
      referralService.applyReferralCodeAtSettings.mockResolvedValueOnce(
        outcome,
      );
      const result = await adapter.applyReferralCodeAtSettings(
        'clinic_1',
        'RFR-AB23CD',
      );
      expect(result).toBe(outcome);
      expect(referralService.applyReferralCodeAtSettings).toHaveBeenCalledWith(
        'clinic_1',
        'RFR-AB23CD',
      );
    });

    it('propagates an INVALID outcome from the underlying service', async () => {
      referralService.applyReferralCodeAtSettings.mockResolvedValueOnce({
        applied: false,
        reason: 'INVALID',
      });
      const result = await adapter.applyReferralCodeAtSettings(
        'clinic_1',
        'nope',
      );
      expect(result).toEqual({ applied: false, reason: 'INVALID' });
    });
  });
});

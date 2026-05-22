import { describe, expect, it } from '@jest/globals';
import {
  readRazorpayClinicId,
  readRazorpayNoteString,
} from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook.helpers';

describe('razorpay-webhook.helpers', () => {
  describe('readRazorpayNoteString', () => {
    it('returns string note values only', () => {
      expect(readRazorpayNoteString({ tier: 'ESSENTIAL' }, 'tier')).toBe(
        'ESSENTIAL',
      );
      expect(readRazorpayNoteString({ tier: 1 }, 'tier')).toBeUndefined();
    });
  });

  describe('readRazorpayClinicId', () => {
    it('reads snake_case clinic_id from payment notes', () => {
      expect(
        readRazorpayClinicId({ clinic_id: 'clinic-snake' }),
      ).toBe('clinic-snake');
    });

    it('reads camelCase clinicId from checkout order notes', () => {
      expect(readRazorpayClinicId({ clinicId: 'clinic-camel' })).toBe(
        'clinic-camel',
      );
    });

    it('prefers clinic_id when both note keys are present', () => {
      expect(
        readRazorpayClinicId({
          clinic_id: 'preferred',
          clinicId: 'fallback',
        }),
      ).toBe('preferred');
    });
  });
});

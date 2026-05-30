import { createHmac } from 'node:crypto';
import { EmailSuppressionReason } from '@workspace/db';
import {
  verifySignature,
  determineSuppressionReason,
  extractRecipientEmails,
} from './zeptomail-webhook.parser';

describe('zeptomail webhook parser', () => {
  const secret = 'topsecret';
  const body = Buffer.from('{"event":"hardbounce"}');
  const sign = (b: Buffer, s: string) =>
    createHmac('sha256', s).update(b).digest('hex');

  describe('verifySignature', () => {
    it('accepts a valid HMAC signature (raw and sha256= prefixed)', () => {
      expect(verifySignature(body, sign(body, secret), secret)).toBe(true);
      expect(
        verifySignature(body, `sha256=${sign(body, secret)}`, secret),
      ).toBe(true);
    });

    it('rejects a wrong signature', () => {
      expect(verifySignature(body, sign(body, 'other'), secret)).toBe(false);
      expect(verifySignature(body, 'not-hex', secret)).toBe(false);
    });

    it('rejects when secret, signature, or body is missing', () => {
      expect(verifySignature(body, sign(body, secret), '')).toBe(false);
      expect(verifySignature(body, undefined, secret)).toBe(false);
      expect(verifySignature(Buffer.from(''), sign(body, secret), secret)).toBe(
        false,
      );
    });
  });

  describe('determineSuppressionReason', () => {
    it('classifies events by keyword', () => {
      expect(determineSuppressionReason({ event: 'spam_complaint' })).toBe(
        EmailSuppressionReason.COMPLAINT,
      );
      expect(determineSuppressionReason({ event: 'unsubscribe' })).toBe(
        EmailSuppressionReason.UNSUBSCRIBE,
      );
      expect(determineSuppressionReason({ event: 'soft_bounce' })).toBe(
        EmailSuppressionReason.SOFT_BOUNCE,
      );
      expect(
        determineSuppressionReason({
          event: 'hardbounce',
          reason: 'mailbox not found',
        }),
      ).toBe(EmailSuppressionReason.HARD_BOUNCE);
    });

    it('returns null for non-suppressing events', () => {
      expect(determineSuppressionReason({ event: 'email_open' })).toBeNull();
      expect(determineSuppressionReason(null)).toBeNull();
    });
  });

  describe('extractRecipientEmails', () => {
    it('extracts recipients and excludes the sender domain', () => {
      const payload = {
        from: 'notifications@docita.work',
        to: 'Patient <p@example.com>',
        cc: 'q@example.com',
      };
      expect(extractRecipientEmails(payload, 'docita.work').sort()).toEqual([
        'p@example.com',
        'q@example.com',
      ]);
    });
  });
});

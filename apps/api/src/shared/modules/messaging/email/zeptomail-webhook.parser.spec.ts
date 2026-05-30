import { createHmac } from 'node:crypto';
import { EmailSuppressionReason } from '@workspace/db';
import {
  verifySignature,
  secretsMatch,
  parseZeptoMailEvents,
} from './zeptomail-webhook.parser';

/** Real ZeptoMail webhook shape (from their data preview), parameterised by event. */
function zeptoPayload(eventName: string, objectType: string) {
  return {
    event_name: [eventName],
    event_message: [
      {
        email_info: {
          from: { address: 'webhooktest@docita.work', name: 'webhooktest' },
          bounce_address: 'webhooktest@docita.work',
          cc: [{ email_address: { address: 'cc@zylker.com', name: 'TestCC' } }],
          reply_to: [{ address: 'replyto@zylker.com', name: 'TestReplyTo' }],
          to: [
            {
              email_address: {
                address: 'bouncerecipient@zylker.com',
                name: 'BounceRecipient',
              },
            },
            {
              email_address: {
                address: 'testrecipient@zylker.com',
                name: 'TestRecipient',
              },
            },
          ],
          object: 'email',
        },
        event_data: [
          {
            details: [
              {
                reason: 'relaying-issues',
                bounced_recipient: 'bouncerecipient@zylker.com',
                time: '2026-05-30T09:07:16Z',
                diagnostic_message: 'policy-related',
              },
            ],
            object: objectType,
          },
        ],
        request_id: 'req-1',
      },
    ],
  };
}

describe('zeptomail webhook parser', () => {
  describe('verifySignature (HMAC fallback)', () => {
    const secret = 'topsecret';
    const body = Buffer.from('{"event":"hardbounce"}');
    const sign = (b: Buffer, s: string) =>
      createHmac('sha256', s).update(b).digest('hex');

    it('accepts a valid signature and rejects bad/missing input', () => {
      expect(verifySignature(body, sign(body, secret), secret)).toBe(true);
      expect(
        verifySignature(body, `sha256=${sign(body, secret)}`, secret),
      ).toBe(true);
      expect(verifySignature(body, sign(body, 'other'), secret)).toBe(false);
      expect(verifySignature(body, undefined, secret)).toBe(false);
      expect(verifySignature(Buffer.from(''), sign(body, secret), secret)).toBe(
        false,
      );
    });
  });

  describe('secretsMatch (Authorization header)', () => {
    it('compares the shared secret constant-time', () => {
      expect(secretsMatch('s3cr3t', 's3cr3t')).toBe(true);
      expect(secretsMatch('wrong', 's3cr3t')).toBe(false);
      expect(secretsMatch(undefined, 's3cr3t')).toBe(false);
      expect(secretsMatch('s3cr3t', '')).toBe(false);
    });
  });

  describe('parseZeptoMailEvents', () => {
    it('suppresses only the bounced_recipient, not the other addresses', () => {
      const events = parseZeptoMailEvents(
        zeptoPayload('hardbounce', 'hardbounce'),
      );
      expect(events).toEqual([
        {
          email: 'bouncerecipient@zylker.com',
          reason: EmailSuppressionReason.HARD_BOUNCE,
        },
      ]);
    });

    it('classifies a soft bounce as SOFT_BOUNCE (caller will skip it)', () => {
      const events = parseZeptoMailEvents(
        zeptoPayload('softbounce', 'softbounce'),
      );
      expect(events).toEqual([
        {
          email: 'bouncerecipient@zylker.com',
          reason: EmailSuppressionReason.SOFT_BOUNCE,
        },
      ]);
    });

    it('returns nothing for non-suppressing / malformed payloads', () => {
      expect(parseZeptoMailEvents(zeptoPayload('email_open', 'open'))).toEqual(
        [],
      );
      expect(parseZeptoMailEvents(null)).toEqual([]);
      expect(parseZeptoMailEvents({})).toEqual([]);
    });
  });
});

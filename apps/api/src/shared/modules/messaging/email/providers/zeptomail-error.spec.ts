import { describe, expect, it } from '@jest/globals';
import { formatZeptoMailErrorBody } from './zeptomail-error';

describe('formatZeptoMailErrorBody', () => {
  it('extracts nested ZeptoMail error messages and details', () => {
    const body = JSON.stringify({
      error: {
        message: 'Invalid request',
        details: [
          {
            code: 'EM_101',
            target: 'reply_to',
            message: 'Invalid data type',
          },
        ],
      },
    });

    expect(formatZeptoMailErrorBody(body)).toBe(
      'Invalid request | EM_101: reply_to: Invalid data type',
    );
  });

  it('returns raw text when the body is not JSON', () => {
    expect(formatZeptoMailErrorBody('upstream timeout')).toBe(
      'upstream timeout',
    );
  });
});

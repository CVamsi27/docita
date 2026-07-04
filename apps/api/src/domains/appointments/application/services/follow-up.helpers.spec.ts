import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { FollowUpStatus } from '@workspace/db';
import { parseFollowUpDate, parseFollowUpStatuses } from './follow-up.helpers';

describe('parseFollowUpDate', () => {
  it('parses a valid ISO date', () => {
    expect(parseFollowUpDate('2026-07-03').getTime()).toBe(
      new Date('2026-07-03').getTime(),
    );
  });
  it('rejects an invalid date string', () => {
    expect(() => parseFollowUpDate('not-a-date')).toThrow(BadRequestException);
  });
});

describe('parseFollowUpStatuses', () => {
  it('defaults to PENDING + REMINDER_SENT when no filter is given', () => {
    expect(parseFollowUpStatuses()).toEqual([
      FollowUpStatus.PENDING,
      FollowUpStatus.REMINDER_SENT,
    ]);
  });

  it('parses a comma-separated, case-insensitive list', () => {
    expect(parseFollowUpStatuses('pending, completed')).toEqual([
      FollowUpStatus.PENDING,
      FollowUpStatus.COMPLETED,
    ]);
  });

  it('drops unknown values and keeps the valid ones', () => {
    expect(parseFollowUpStatuses('pending,bogus')).toEqual([
      FollowUpStatus.PENDING,
    ]);
  });

  it('returns undefined when nothing valid remains', () => {
    expect(parseFollowUpStatuses('bogus,nope')).toBeUndefined();
  });
});

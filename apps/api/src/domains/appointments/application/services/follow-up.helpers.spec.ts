import { BadRequestException } from '@nestjs/common';
import { FollowUpStatus } from '@workspace/db';
import { parseFollowUpDate, parseFollowUpStatuses } from './follow-up.helpers';

describe('parseFollowUpDate', () => {
  it('returns a valid Date for a valid ISO string', () => {
    const result = parseFollowUpDate('2026-03-15T10:30:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2026-03-15T10:30:00.000Z');
  });

  it('returns a valid Date for a date-only string', () => {
    const result = parseFollowUpDate('2026-06-01');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
  });

  it('throws BadRequestException for an invalid date string', () => {
    expect(() => parseFollowUpDate('not-a-date')).toThrow(BadRequestException);
  });

  it('throws BadRequestException with descriptive message', () => {
    expect(() => parseFollowUpDate('invalid')).toThrow(
      'Follow-up date filter is invalid',
    );
  });

  it('throws BadRequestException for an empty string', () => {
    expect(() => parseFollowUpDate('')).toThrow(BadRequestException);
  });
});

describe('parseFollowUpStatuses', () => {
  it('returns default statuses when no status is provided', () => {
    const result = parseFollowUpStatuses(undefined);
    expect(result).toEqual([
      FollowUpStatus.PENDING,
      FollowUpStatus.REMINDER_SENT,
    ]);
  });

  it('returns default statuses for empty string', () => {
    const result = parseFollowUpStatuses('');
    expect(result).toEqual([
      FollowUpStatus.PENDING,
      FollowUpStatus.REMINDER_SENT,
    ]);
  });

  it('parses a single valid status', () => {
    const result = parseFollowUpStatuses('PENDING');
    expect(result).toEqual([FollowUpStatus.PENDING]);
  });

  it('parses multiple comma-separated statuses', () => {
    const result = parseFollowUpStatuses('PENDING,BOOKED,COMPLETED');
    expect(result).toEqual([
      FollowUpStatus.PENDING,
      FollowUpStatus.BOOKED,
      FollowUpStatus.COMPLETED,
    ]);
  });

  it('handles lowercase status values', () => {
    const result = parseFollowUpStatuses('pending,reminder_sent');
    expect(result).toEqual([
      FollowUpStatus.PENDING,
      FollowUpStatus.REMINDER_SENT,
    ]);
  });

  it('handles statuses with whitespace', () => {
    const result = parseFollowUpStatuses(' PENDING , BOOKED ');
    expect(result).toEqual([FollowUpStatus.PENDING, FollowUpStatus.BOOKED]);
  });

  it('filters out unknown statuses', () => {
    const result = parseFollowUpStatuses('PENDING,BOGUS,BOOKED');
    expect(result).toEqual([FollowUpStatus.PENDING, FollowUpStatus.BOOKED]);
  });

  it('returns undefined when all statuses are invalid', () => {
    const result = parseFollowUpStatuses('BOGUS,INVALID');
    expect(result).toBeUndefined();
  });

  it('parses all valid FollowUpStatus values', () => {
    const allStatuses =
      'PENDING,REMINDER_SENT,BOOKED,COMPLETED,CANCELLED,EXPIRED';
    const result = parseFollowUpStatuses(allStatuses);
    expect(result).toEqual([
      FollowUpStatus.PENDING,
      FollowUpStatus.REMINDER_SENT,
      FollowUpStatus.BOOKED,
      FollowUpStatus.COMPLETED,
      FollowUpStatus.CANCELLED,
      FollowUpStatus.EXPIRED,
    ]);
  });
});

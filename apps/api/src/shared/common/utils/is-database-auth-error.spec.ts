import { describe, expect, it } from '@jest/globals';
import { isDatabaseAuthError } from './is-database-auth-error';

describe('is-database-auth-error', () => {
  it('detects Prisma P1000 authentication failure codes', () => {
    expect(isDatabaseAuthError({ code: 'P1000' })).toBe(true);
  });

  it('detects authentication-failed message text case-insensitively', () => {
    expect(
      isDatabaseAuthError({
        message: 'authentication failed against the database server',
      }),
    ).toBe(true);
    expect(
      isDatabaseAuthError({
        message: 'Invalid database credentials provided',
      }),
    ).toBe(true);
    expect(
      isDatabaseAuthError({
        message: 'PASSWORD AUTHENTICATION FAILED FOR USER',
      }),
    ).toBe(true);
  });

  it('rejects non-auth Prisma codes and messages', () => {
    expect(isDatabaseAuthError({ code: 'P2002' })).toBe(false);
    expect(isDatabaseAuthError({ message: 'connection refused' })).toBe(false);
    expect(isDatabaseAuthError({ code: 'P1000', message: '' })).toBe(true);
  });

  it('rejects non-record inputs', () => {
    expect(isDatabaseAuthError(null)).toBe(false);
    expect(isDatabaseAuthError(undefined)).toBe(false);
    expect(isDatabaseAuthError('auth failed')).toBe(false);
    expect(isDatabaseAuthError(42)).toBe(false);
  });

  it('rejects plain Error instances without auth markers', () => {
    expect(isDatabaseAuthError(new Error('something else'))).toBe(false);
  });
});

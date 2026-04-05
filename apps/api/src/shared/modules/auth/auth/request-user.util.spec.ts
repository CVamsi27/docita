import { describe, expect, it } from '@jest/globals';
import { getAuthenticatedUserId } from './request-user.util';

describe('getAuthenticatedUserId', () => {
  it('returns sub when present', () => {
    expect(getAuthenticatedUserId({ sub: 'user-sub-id', id: 'user-id' })).toBe(
      'user-sub-id',
    );
  });

  it('falls back to id when sub is missing', () => {
    expect(getAuthenticatedUserId({ id: 'user-id' })).toBe('user-id');
  });

  it('returns null for invalid shapes', () => {
    expect(getAuthenticatedUserId(null)).toBeNull();
    expect(getAuthenticatedUserId({ sub: '' })).toBeNull();
    expect(getAuthenticatedUserId({})).toBeNull();
  });
});

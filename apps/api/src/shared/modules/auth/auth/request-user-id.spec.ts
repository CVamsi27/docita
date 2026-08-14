import { describe, expect, it } from '@jest/globals';
import { getAuthenticatedUserId } from './request-user-id';

describe('getAuthenticatedUserId', () => {
  it('returns the trimmed sub when it is a non-empty string', () => {
    expect(getAuthenticatedUserId({ sub: '  user-123  ' })).toBe('user-123');
  });

  it('falls back to id when sub is missing or empty', () => {
    expect(getAuthenticatedUserId({ id: '  fallback-id  ' })).toBe(
      'fallback-id',
    );
    expect(getAuthenticatedUserId({ sub: '', id: 'primary-id' })).toBe(
      'primary-id',
    );
  });

  it('prefers sub over id when both are present', () => {
    expect(getAuthenticatedUserId({ sub: 'sub-id', id: 'fallback-id' })).toBe(
      'sub-id',
    );
  });

  it('returns null for non-record inputs', () => {
    expect(getAuthenticatedUserId(null)).toBeNull();
    expect(getAuthenticatedUserId(undefined)).toBeNull();
    expect(getAuthenticatedUserId('not-an-object')).toBeNull();
    expect(getAuthenticatedUserId(42)).toBeNull();
    expect(getAuthenticatedUserId([])).toBeNull();
  });

  it('returns null when sub and id are not strings', () => {
    expect(getAuthenticatedUserId({ sub: 123, id: 456 })).toBeNull();
    expect(getAuthenticatedUserId({ sub: null, id: undefined })).toBeNull();
  });

  it('returns null when both sub and id are empty after trimming', () => {
    expect(getAuthenticatedUserId({ sub: '   ', id: '' })).toBeNull();
  });
});

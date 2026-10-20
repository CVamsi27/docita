import { resolveJwtExpiresIn } from './app-config-jwt.helpers';

describe('resolveJwtExpiresIn', () => {
  it('passes suffixed durations through in every supported unit', () => {
    expect(resolveJwtExpiresIn('30s')).toBe('30s');
    expect(resolveJwtExpiresIn('15m')).toBe('15m');
    expect(resolveJwtExpiresIn('12h')).toBe('12h');
    expect(resolveJwtExpiresIn('7d')).toBe('7d');
    expect(resolveJwtExpiresIn('2w')).toBe('2w');
    expect(resolveJwtExpiresIn('1y')).toBe('1y');
  });

  it('converts bare digit values to seconds', () => {
    expect(resolveJwtExpiresIn('900')).toBe(900);
    expect(resolveJwtExpiresIn('0')).toBe(0);
  });

  it('falls back on malformed values instead of guessing', () => {
    expect(resolveJwtExpiresIn('')).toBe('7d');
    expect(resolveJwtExpiresIn('abc')).toBe('7d');
    expect(resolveJwtExpiresIn('7 days')).toBe('7d');
    expect(resolveJwtExpiresIn('h')).toBe('7d');
    expect(resolveJwtExpiresIn('-5m')).toBe('7d');
    expect(resolveJwtExpiresIn('1.5h')).toBe('7d');
  });

  it('honors a custom fallback', () => {
    expect(resolveJwtExpiresIn('abc', '12h')).toBe('12h');
  });
});

import { resolveCurrencyFromLocale } from './app-config-currency.helpers';

describe('resolveCurrencyFromLocale', () => {
  it('returns INR for en-IN', () => {
    expect(resolveCurrencyFromLocale('en-IN')).toBe('INR');
  });

  it('returns INR for hi-IN', () => {
    expect(resolveCurrencyFromLocale('hi-IN')).toBe('INR');
  });

  it('returns USD for en-US', () => {
    expect(resolveCurrencyFromLocale('en-US')).toBe('USD');
  });

  it('returns GBP for en-GB', () => {
    expect(resolveCurrencyFromLocale('en-GB')).toBe('GBP');
  });

  it('returns EUR for de-DE', () => {
    expect(resolveCurrencyFromLocale('de-DE')).toBe('EUR');
  });

  it('returns EUR for fr-FR', () => {
    expect(resolveCurrencyFromLocale('fr-FR')).toBe('EUR');
  });

  it('returns JPY for ja-JP', () => {
    expect(resolveCurrencyFromLocale('ja-JP')).toBe('JPY');
  });

  it('returns BRL for pt-BR', () => {
    expect(resolveCurrencyFromLocale('pt-BR')).toBe('BRL');
  });

  it('falls back to country code for unknown locale prefix', () => {
    // "xx-IN" has unknown prefix but known country code IN
    expect(resolveCurrencyFromLocale('xx-IN')).toBe('INR');
  });

  it('returns INR for undefined', () => {
    expect(resolveCurrencyFromLocale(undefined)).toBe('INR');
  });

  it('returns INR for empty string', () => {
    expect(resolveCurrencyFromLocale('')).toBe('INR');
  });

  it('handles quality values in Accept-Language', () => {
    // Quality values are stripped; first locale that matches wins
    expect(resolveCurrencyFromLocale('en-US;q=0.9,en-IN;q=1.0')).toBe('USD');
  });

  it('returns INR for completely unknown locale', () => {
    expect(resolveCurrencyFromLocale('xx-YY')).toBe('INR');
  });

  it('handles multiple locales, picks first match', () => {
    expect(resolveCurrencyFromLocale('fr-FR, en-US')).toBe('EUR');
  });

  it('returns INR when only Indian locale is present after stripping quality', () => {
    expect(resolveCurrencyFromLocale('en-IN;q=0.8')).toBe('INR');
  });
});

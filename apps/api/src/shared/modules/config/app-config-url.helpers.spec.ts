import { describe, expect, it } from '@jest/globals';
import {
  parseHostname,
  emailLinkBaseUrlFromAppUrl,
  resolveSharedCookieDomain,
} from './app-config-url.helpers';

describe('parseHostname', () => {
  it('returns the hostname from a valid URL', () => {
    expect(parseHostname('https://api.docita.work')).toBe('api.docita.work');
    expect(parseHostname('http://localhost:3000')).toBe('localhost');
  });

  it('returns null for an invalid URL', () => {
    expect(parseHostname('not-a-url')).toBeNull();
    expect(parseHostname('')).toBeNull();
  });
});

describe('emailLinkBaseUrlFromAppUrl', () => {
  it('returns trimmed URL unchanged in production', () => {
    expect(emailLinkBaseUrlFromAppUrl('https://app.docita.work/', false)).toBe(
      'https://app.docita.work',
    );
  });

  it('forces http protocol in development', () => {
    expect(emailLinkBaseUrlFromAppUrl('https://app.docita.work', true)).toBe(
      'http://app.docita.work',
    );
  });

  it('preserves a path in development', () => {
    expect(
      emailLinkBaseUrlFromAppUrl('https://app.docita.work/basepath', true),
    ).toBe('http://app.docita.work/basepath');
  });

  it('returns trimmed value when URL is not parseable in dev', () => {
    expect(emailLinkBaseUrlFromAppUrl('localhost:3000', true)).toBe(
      'http://localhost:3000',
    );
  });
});

describe('resolveSharedCookieDomain', () => {
  it('returns undefined for fewer than 2 hostnames', () => {
    expect(resolveSharedCookieDomain([])).toBeUndefined();
    expect(resolveSharedCookieDomain(['api.docita.work'])).toBeUndefined();
  });

  it('returns undefined when localhost is in the list', () => {
    expect(
      resolveSharedCookieDomain(['localhost', 'api.docita.work']),
    ).toBeUndefined();
  });

  it('resolves the shared TLD+1 for sibling subdomains', () => {
    expect(
      resolveSharedCookieDomain(['api.docita.work', 'app.docita.work']),
    ).toBe('docita.work');
  });

  it('returns undefined when there is no shared domain', () => {
    expect(
      resolveSharedCookieDomain(['api.docita.work', 'app.example.com']),
    ).toBeUndefined();
  });

  it('returns undefined for IP addresses', () => {
    expect(
      resolveSharedCookieDomain(['192.168.1.1', 'api.docita.work']),
    ).toBeUndefined();
  });
});

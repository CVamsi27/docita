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

  it('returns hostname for URLs with path or trailing slash', () => {
    expect(parseHostname('https://api.docita.work/path/to/resource')).toBe(
      'api.docita.work',
    );
    expect(parseHostname('https://app.docita.work/')).toBe('app.docita.work');
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

  it('trims whitespace from the URL', () => {
    expect(
      emailLinkBaseUrlFromAppUrl('  https://app.docita.work/  ', false),
    ).toBe('https://app.docita.work');
  });

  it('trims trailing slashes from the URL', () => {
    expect(
      emailLinkBaseUrlFromAppUrl('https://app.docita.work///', false),
    ).toBe('https://app.docita.work');
  });

  it('preserves nested path with trailing slash in development', () => {
    expect(
      emailLinkBaseUrlFromAppUrl('https://app.docita.work/basepath/sub/', true),
    ).toBe('http://app.docita.work/basepath/sub');
  });

  it('returns fallback trimmed value for unparseable URL in production', () => {
    expect(emailLinkBaseUrlFromAppUrl('  not-a-url  ', false)).toBe(
      'not-a-url',
    );
  });

  it('handles protocol-relative URL in development', () => {
    expect(emailLinkBaseUrlFromAppUrl('//app.docita.work', true)).toBe(
      'http://app.docita.work',
    );
  });

  it('handles bare hostname in development', () => {
    expect(emailLinkBaseUrlFromAppUrl('app.docita.work', true)).toBe(
      'http://app.docita.work',
    );
  });

  it('preserves root path in development', () => {
    expect(emailLinkBaseUrlFromAppUrl('https://app.docita.work/', true)).toBe(
      'http://app.docita.work',
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

  it('returns undefined for IPv6 addresses', () => {
    expect(
      resolveSharedCookieDomain(['::1', 'api.docita.work']),
    ).toBeUndefined();
  });

  it('resolves shared domain for 3 hostnames', () => {
    expect(
      resolveSharedCookieDomain([
        'api.docita.work',
        'app.docita.work',
        'admin.docita.work',
      ]),
    ).toBe('docita.work');
  });

  it('resolves shared domain for hostnames with 3+ levels', () => {
    expect(
      resolveSharedCookieDomain([
        'api.east.docita.work',
        'app.west.docita.work',
      ]),
    ).toBe('docita.work');
  });

  it('returns undefined when only TLD matches', () => {
    expect(
      resolveSharedCookieDomain(['api.test.com', 'api.example.com']),
    ).toBeUndefined();
  });

  it('handles whitespace in hostnames', () => {
    expect(
      resolveSharedCookieDomain(['  api.docita.work', 'app.docita.work  ']),
    ).toBe('docita.work');
  });

  it('filters out empty hostnames', () => {
    expect(resolveSharedCookieDomain(['api.docita.work', ''])).toBeUndefined();
  });

  it('returns shared domain for mixed-case hostnames', () => {
    expect(
      resolveSharedCookieDomain(['API.Docita.Work', 'app.Docita.Work']),
    ).toBe('docita.work');
  });
});

import {
  emailLinkBaseUrlFromAppUrl,
  isIpAddress,
  parseHostname,
  resolveSharedCookieDomain,
} from './app-config-url.helpers';

describe('parseHostname', () => {
  it('extracts hostname from a full URL', () => {
    expect(parseHostname('https://app.docita.work/path')).toBe(
      'app.docita.work',
    );
  });

  it('lowercases the hostname', () => {
    expect(parseHostname('https://App.Docita.Work')).toBe('app.docita.work');
  });

  it('returns null for an unparseable string', () => {
    expect(parseHostname('')).toBe(null);
    expect(parseHostname('not-a-url')).toBe(null);
  });
});

describe('emailLinkBaseUrlFromAppUrl', () => {
  it('returns the trimmed URL when not in development mode', () => {
    expect(emailLinkBaseUrlFromAppUrl('https://app.docita.work/', false)).toBe(
      'https://app.docita.work',
    );
  });

  it('strips trailing slashes from the URL', () => {
    expect(
      emailLinkBaseUrlFromAppUrl('https://app.docita.work///', false),
    ).toBe('https://app.docita.work');
  });

  it('returns the origin when the path is just "/" in dev mode', () => {
    expect(emailLinkBaseUrlFromAppUrl('https://app.docita.work/', true)).toBe(
      'http://app.docita.work',
    );
  });

  it('preserves a non-root path in dev mode', () => {
    expect(
      emailLinkBaseUrlFromAppUrl('https://staging.docita.work/internal', true),
    ).toBe('http://staging.docita.work/internal');
  });

  it('falls back to the trimmed input when URL parsing truly fails in dev mode', () => {
    expect(emailLinkBaseUrlFromAppUrl('', true)).toBe('');
  });
});

describe('resolveSharedCookieDomain', () => {
  it('returns undefined for fewer than 2 hostnames', () => {
    expect(resolveSharedCookieDomain(['app.docita.work'])).toBeUndefined();
    expect(resolveSharedCookieDomain([])).toBeUndefined();
  });

  it('returns undefined when any hostname is localhost', () => {
    expect(
      resolveSharedCookieDomain(['app.docita.work', 'localhost']),
    ).toBeUndefined();
  });

  it('returns undefined when any hostname is an IP address', () => {
    expect(
      resolveSharedCookieDomain(['app.docita.work', '192.168.1.1']),
    ).toBeUndefined();
  });

  it('returns the shared second-level domain for two app subdomains', () => {
    expect(
      resolveSharedCookieDomain(['app.docita.work', 'api.docita.work']),
    ).toBe('docita.work');
  });

  it('handles hostnames with more than two segments', () => {
    expect(
      resolveSharedCookieDomain([
        'us-east.app.docita.work',
        'eu-west.app.docita.work',
      ]),
    ).toBe('app.docita.work');
  });

  it('returns undefined when hostnames share fewer than 2 segments', () => {
    expect(resolveSharedCookieDomain(['app.com', 'app.org'])).toBeUndefined();
  });

  it('returns undefined when any hostname has an IPv6 colon notation', () => {
    expect(
      resolveSharedCookieDomain(['app.docita.work', '::1']),
    ).toBeUndefined();
  });
});

describe('isIpAddress', () => {
  it('returns true for IPv4 addresses', () => {
    expect(isIpAddress('192.168.1.1')).toBe(true);
    expect(isIpAddress('10.0.0.1')).toBe(true);
  });

  it('returns true for IPv6 colon notation', () => {
    expect(isIpAddress('::1')).toBe(true);
    expect(isIpAddress('fe80::1')).toBe(true);
  });

  it('returns false for hostnames', () => {
    expect(isIpAddress('example.com')).toBe(false);
    expect(isIpAddress('localhost')).toBe(false);
    expect(isIpAddress('192.168.1')).toBe(false);
  });
});

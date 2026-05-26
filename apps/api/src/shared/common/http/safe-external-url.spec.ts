import { describe, expect, it } from '@jest/globals';
import {
  assertSafeExternalUrl,
  UnsafeExternalUrlError,
} from './safe-external-url';

describe('assertSafeExternalUrl', () => {
  it('accepts a normal https URL', () => {
    expect(() =>
      assertSafeExternalUrl('https://example.com/path?x=1'),
    ).not.toThrow();
  });

  it.each([
    'http://example.com',
    'ftp://example.com',
    'file:///etc/passwd',
    'gopher://example.com',
    'data:text/plain,hi',
  ])('rejects non-https protocol: %s', (url) => {
    expect(() => assertSafeExternalUrl(url)).toThrow(UnsafeExternalUrlError);
  });

  it.each([
    'https://localhost/x',
    'https://localhost.localdomain/x',
    'https://metadata.google.internal/x',
    'https://metadata/x',
  ])('rejects blocked hostname: %s', (url) => {
    expect(() => assertSafeExternalUrl(url)).toThrow(UnsafeExternalUrlError);
  });

  it.each([
    'https://169.254.169.254/latest/meta-data/',
    'https://127.0.0.1/',
    'https://10.0.0.1/',
    'https://192.168.1.1/',
    'https://172.16.0.1/',
    'https://172.31.255.254/',
  ])('rejects private/internal IP: %s', (url) => {
    expect(() => assertSafeExternalUrl(url)).toThrow(UnsafeExternalUrlError);
  });

  it('rejects literal public IPs too (use hostnames)', () => {
    expect(() => assertSafeExternalUrl('https://8.8.8.8/')).toThrow(
      UnsafeExternalUrlError,
    );
  });

  it('rejects when origin is not on the allowlist', () => {
    expect(() =>
      assertSafeExternalUrl('https://attacker.example/', {
        allowedOrigins: ['https://cdn.docita.work'],
      }),
    ).toThrow(UnsafeExternalUrlError);
  });

  it('accepts when origin is on the allowlist', () => {
    expect(() =>
      assertSafeExternalUrl('https://cdn.docita.work/img/logo.png', {
        allowedOrigins: ['https://cdn.docita.work'],
      }),
    ).not.toThrow();
  });

  it('rejects malformed URLs', () => {
    expect(() => assertSafeExternalUrl('not a url')).toThrow(
      UnsafeExternalUrlError,
    );
  });
});

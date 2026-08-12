import { describe, expect, it } from '@jest/globals';
import { shouldBypassGuardForE2eConfig } from './app-configuration-values';

// Security-review VULN-001: the x-docita-e2e header must never disable the
// auth rate limiters / email-verified gate on a deployed (internet-facing)
// environment. Only NODE_ENV=test honors the header; prod/staging never
// bypass; DOCITA_API_E2E=true remains the explicit operator switch outside
// prod/staging (the API e2e suite sets it in test/setup-e2e-env.ts).
describe('shouldBypassGuardForE2eConfig (VULN-001 hardening)', () => {
  it('never bypasses in production, even with the header AND the explicit switch', () => {
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'production',
        apiE2eEnabled: true,
        e2eHeaderValue: 'true',
      }),
    ).toBe(false);
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'production',
        apiE2eEnabled: false,
        e2eHeaderValue: 'true',
      }),
    ).toBe(false);
  });

  it('never bypasses in staging (internet-facing Render), header or switch', () => {
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'staging',
        apiE2eEnabled: true,
        e2eHeaderValue: 'true',
      }),
    ).toBe(false);
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'staging',
        apiE2eEnabled: false,
        e2eHeaderValue: 'true',
      }),
    ).toBe(false);
  });

  it('honors the header ONLY under NODE_ENV=test', () => {
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'test',
        apiE2eEnabled: false,
        e2eHeaderValue: 'true',
      }),
    ).toBe(true);
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'test',
        apiE2eEnabled: false,
        e2eHeaderValue: undefined,
      }),
    ).toBe(false);
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'test',
        apiE2eEnabled: false,
        e2eHeaderValue: 'false',
      }),
    ).toBe(false);
  });

  it('does not honor the header in development; the explicit switch still works there', () => {
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'development',
        apiE2eEnabled: false,
        e2eHeaderValue: 'true',
      }),
    ).toBe(false);
    expect(
      shouldBypassGuardForE2eConfig({
        nodeEnv: 'development',
        apiE2eEnabled: true,
        e2eHeaderValue: undefined,
      }),
    ).toBe(true);
  });
});

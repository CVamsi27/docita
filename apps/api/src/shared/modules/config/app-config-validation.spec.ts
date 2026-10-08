import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { z } from 'zod';
import { assertRuntimeSecretRequirements } from './app-config-validation';
import { EnvSchema } from './env-schema';
import { asType } from '@/test-utils';

type RuntimeConfig = z.infer<typeof EnvSchema>;

function buildConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return asType<RuntimeConfig>({
    NODE_ENV: 'production',
    WORKER_ENTRYPOINT: 'main',
    JWT_SECRET: 'test-jwt-secret-minimum-32-characters',
    RAZORPAY_KEY_ID: 'rzp_test_123',
    RAZORPAY_KEY_SECRET: 'razorpay-secret',
    RAZORPAY_WEBHOOK_SECRET: 'whsec_123',
    ...overrides,
  });
}

// Security-review VULN-002: TurnstileVerifyService no-ops when
// TURNSTILE_SECRET_KEY is unset, which would silently disable the
// login/register bot-check on a misconfigured production/staging deploy.
// assertRuntimeSecretRequirements must fail boot in that case.
describe('assertRuntimeSecretRequirements — Turnstile fail-closed (VULN-002)', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let stderrSpy: jest.SpiedFunction<typeof process.stderr.write>;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('fails boot in production when TURNSTILE_SECRET_KEY is missing', () => {
    expect(() => assertRuntimeSecretRequirements(buildConfig({}))).toThrow(
      'process.exit called',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls
      .map((args) => String(args[0]))
      .join('');
    expect(stderrOutput).toContain('TURNSTILE_SECRET_KEY');
  });

  it('fails boot in staging when TURNSTILE_SECRET_KEY is missing', () => {
    expect(() =>
      assertRuntimeSecretRequirements(buildConfig({ NODE_ENV: 'staging' })),
    ).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('boots in production when TURNSTILE_SECRET_KEY is set', () => {
    expect(() =>
      assertRuntimeSecretRequirements(
        buildConfig({
          TURNSTILE_SECRET_KEY: '0x4AA00000000000000000000000000000',
        }),
      ),
    ).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it.each(['production', 'staging'] as const)(
    'rejects the legacy TURNSTILE_OPTIONAL bypass in %s',
    (NODE_ENV) => {
      const config = { ...buildConfig({ NODE_ENV }), TURNSTILE_OPTIONAL: true };
      expect(() => assertRuntimeSecretRequirements(config)).toThrow(
        'process.exit called',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    },
  );

  it('does not require the secret in development or on the worker', () => {
    expect(() =>
      assertRuntimeSecretRequirements(buildConfig({ NODE_ENV: 'development' })),
    ).not.toThrow();

    expect(() =>
      assertRuntimeSecretRequirements(
        buildConfig({
          NODE_ENV: 'production',
          WORKER_ENTRYPOINT: 'worker',
          QUEUE_BACKEND: 'postgres',
        }),
      ),
    ).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

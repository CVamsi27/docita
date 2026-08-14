import { describe, expect, it } from '@jest/globals';
import type { EnvConfig } from './app-config';
import { DatabaseControlConfigService } from './database-control-config.service';

function makeConfig(
  envOverrides: Partial<EnvConfig> = {},
): DatabaseControlConfigService {
  const env: EnvConfig = {
    DATABASE_CONTROL_ENABLED: false,
    DATABASE_CONTROL_ALLOWED_ENV: 'production,staging',
    DATABASE_CONTROL_AWS_REGION: 'ap-south-1',
    DATABASE_CONTROL_RDS_INSTANCE_ID: 'docita-db',
    DATABASE_CONTROL_ALERT_EMAIL: 'admin@docita.work',
    DATABASE_CONTROL_DEPLOY_GUARD: true,
    DATABASE_CONTROL_COOLDOWN_SECONDS: 60,
    AWS_REGION: 'ap-south-1',
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    ...envOverrides,
  } as EnvConfig;
  // The constructor accepts a `getEnvFn` test seam so we can inject a
  // custom env without any module-level mocking.
  return new DatabaseControlConfigService(() => env);
}

describe('DatabaseControlConfigService', () => {
  it('is disabled by default', () => {
    const svc = makeConfig();
    expect(svc.isEnabled()).toBe(false);
  });

  it('reports current environment allowed when in allowlist (case-insensitive)', () => {
    const svc = makeConfig({
      DATABASE_CONTROL_ALLOWED_ENV: 'production,staging',
    });
    expect(svc.isCurrentEnvironmentAllowed('production')).toBe(true);
    expect(svc.isCurrentEnvironmentAllowed('PRODUCTION')).toBe(true);
    expect(svc.isCurrentEnvironmentAllowed('development')).toBe(false);
  });

  it('returns AWS region preferring DATABASE_CONTROL_AWS_REGION', () => {
    const svc = makeConfig({
      DATABASE_CONTROL_AWS_REGION: 'ap-south-1',
      AWS_REGION: 'us-east-1',
    });
    expect(svc.getAwsRegion()).toBe('ap-south-1');
  });

  it('falls back to AWS_REGION when DATABASE_CONTROL_AWS_REGION is empty', () => {
    const svc = makeConfig({
      DATABASE_CONTROL_AWS_REGION: '',
      AWS_REGION: 'us-east-1',
    });
    expect(svc.getAwsRegion()).toBe('us-east-1');
  });

  it('returns credentials only when both keys are set', () => {
    expect(
      makeConfig({
        AWS_ACCESS_KEY_ID: 'AKIA-test',
        AWS_SECRET_ACCESS_KEY: 'secret',
      }).getAwsCredentials(),
    ).toEqual({ accessKeyId: 'AKIA-test', secretAccessKey: 'secret' });
    expect(
      makeConfig({
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '',
      }).getAwsCredentials(),
    ).toBeUndefined();
  });

  it('throws if RDS instance id is missing', () => {
    const env: EnvConfig = {
      DATABASE_CONTROL_ENABLED: false,
      DATABASE_CONTROL_ALLOWED_ENV: 'production,staging',
      DATABASE_CONTROL_AWS_REGION: 'ap-south-1',
      DATABASE_CONTROL_RDS_INSTANCE_ID: undefined,
      DATABASE_CONTROL_ALERT_EMAIL: 'admin@docita.work',
      DATABASE_CONTROL_DEPLOY_GUARD: true,
      DATABASE_CONTROL_COOLDOWN_SECONDS: 60,
      AWS_REGION: 'ap-south-1',
      AWS_ACCESS_KEY_ID: '',
      AWS_SECRET_ACCESS_KEY: '',
    } as EnvConfig;
    const svc = new DatabaseControlConfigService(() => env);
    expect(() => svc.getRdsInstanceId()).toThrow(
      /DATABASE_CONTROL_RDS_INSTANCE_ID/,
    );
  });

  it('cooldown defaults to 60 seconds', () => {
    expect(makeConfig().getCooldownSeconds()).toBe(60);
  });

  it('assertEnabledAndConfigured is a no-op when feature is disabled', () => {
    const svc = makeConfig();
    expect(() => svc.assertEnabledAndConfigured()).not.toThrow();
  });

  it('assertEnabledAndConfigured throws when enabled but missing alert email', () => {
    const svc = makeConfig({
      DATABASE_CONTROL_ENABLED: true,
      DATABASE_CONTROL_ALERT_EMAIL: undefined,
    });
    expect(() => svc.assertEnabledAndConfigured()).toThrow(
      /DATABASE_CONTROL_ALERT_EMAIL/,
    );
  });
});

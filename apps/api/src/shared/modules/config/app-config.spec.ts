import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

describe('app-config validateEnv', () => {
  const originalEnv = process.env;

  function createBaseEnv(overrides: Record<string, string | undefined> = {}) {
    return {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:password@db.example.com/docita',
      ENCRYPTION_KEY:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      APP_URL: 'https://app.docita.work',
      NEXT_PUBLIC_APP_URL: 'https://app.docita.work',
      NEXT_PUBLIC_API_URL: 'https://api.docita.work/api/v1',
      CORS_ORIGINS: 'https://app.docita.work,https://internal.docita.work',
      RAZORPAY_KEY_ID: 'rzp_test_release_validation',
      RAZORPAY_KEY_SECRET: 'test-razorpay-secret',
      RAZORPAY_WEBHOOK_SECRET: 'test-razorpay-webhook-secret',
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    const { EnvConfigStore } = await import('./env-config.store');
    EnvConfigStore.resetForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('allows worker entrypoints to validate without JWT_SECRET', async () => {
    process.env = createBaseEnv({
      WORKER_ENTRYPOINT: 'worker',
      QUEUE_BACKEND: 'postgres',
      JWT_SECRET: undefined,
    });

    const { validateEnv } = await import('./app-config');

    expect(validateEnv()).toMatchObject({
      WORKER_ENTRYPOINT: 'worker',
      JWT_SECRET: undefined,
    });
  });

  it('parses ENABLE_SCHEDULERS=false as disabled', async () => {
    process.env = createBaseEnv({
      JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
      ENABLE_SCHEDULERS: 'false',
    });

    const { validateEnv } = await import('./app-config');

    expect(validateEnv().ENABLE_SCHEDULERS).toBe(false);
  });

  it('exits when the main API runtime has no JWT_SECRET', async () => {
    process.env = createBaseEnv({
      WORKER_ENTRYPOINT: 'main',
      JWT_SECRET: undefined,
    });

    const stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    const { validateEnv } = await import('./app-config');

    expect(() => validateEnv()).toThrow('process.exit:1');
    expect(stderrSpy).toHaveBeenCalledWith(
      '\nAPI environment validation failed.\n',
    );
    expect(stderrSpy).toHaveBeenCalledWith(
      'Please fix the following environment variables:\n',
    );
    expect(stderrSpy).toHaveBeenCalledWith('  - JWT_SECRET: Required\n\n');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits when worker uses non-postgres queue in production', async () => {
    process.env = createBaseEnv({
      WORKER_ENTRYPOINT: 'worker',
      JWT_SECRET: undefined,
      QUEUE_BACKEND: 'memory',
      NODE_ENV: 'production',
    });

    const stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    const { validateEnv } = await import('./app-config');

    expect(() => validateEnv()).toThrow('process.exit:1');
    expect(stderrSpy).toHaveBeenCalledWith(
      '  - QUEUE_BACKEND: Must be postgres for worker in staging/production\n\n',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits when staging CORS_ORIGINS includes non-docita hosts', async () => {
    process.env = createBaseEnv({
      JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
      NODE_ENV: 'staging',
      CORS_ORIGINS: 'https://evil.example',
    });

    const stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    const { validateEnv } = await import('./app-config');

    expect(() => validateEnv()).toThrow('process.exit:1');
    expect(stderrSpy).toHaveBeenCalledWith(
      'CORS_ORIGINS must list https://*.docita.work hosts only. Invalid entry: https://evil.example\n\n',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

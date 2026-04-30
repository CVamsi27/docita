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
      APP_URL: 'https://api.docita.work',
      NEXT_PUBLIC_APP_URL: 'https://app.docita.work',
      NEXT_PUBLIC_API_URL: 'https://api.docita.work/api',
      CORS_ORIGINS: 'https://app.docita.work',
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
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
});

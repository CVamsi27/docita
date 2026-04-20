import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const ORIGINAL_ENV = process.env;

function buildBaseEnv() {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/docita',
    ENCRYPTION_KEY:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    APP_URL: 'https://api.docita.test',
    NEXT_PUBLIC_APP_URL: 'https://app.docita.test',
    NEXT_PUBLIC_API_URL: 'https://api.docita.test/api',
    CORS_ORIGINS: 'https://app.docita.test',
    NODE_ENV: 'production',
  };
}

describe('app-config validateEnv', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...buildBaseEnv() };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('allows worker runtime without JWT_SECRET', async () => {
    process.env.WORKER_ENTRYPOINT = 'worker';

    const { validateEnv } = await import('./app-config');
    const config = validateEnv();

    expect(config.WORKER_ENTRYPOINT).toBe('worker');
    expect(config.JWT_SECRET).toBeUndefined();
  });

  it('fails fast for API runtime when JWT_SECRET is missing', async () => {
    const stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {
        throw new Error('process.exit:1');
      }) as never);

    const { validateEnv } = await import('./app-config');

    expect(() => validateEnv()).toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrSpy).toHaveBeenCalledWith('  - JWT_SECRET: Required\n\n');

    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

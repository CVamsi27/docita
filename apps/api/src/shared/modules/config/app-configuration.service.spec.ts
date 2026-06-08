import { describe, expect, it, jest } from '@jest/globals';
import { AuthSecurityConfigService } from './auth-security-config.service';
import { WORKER_JWT_MODULE_PLACEHOLDER_SECRET, type EnvConfig } from './app-config';

function makeService(config: Partial<EnvConfig>): AuthSecurityConfigService {
  const service = new AuthSecurityConfigService();
  jest.spyOn(service, 'getConfig').mockReturnValue(config as EnvConfig);
  return service;
}

describe('AuthSecurityConfigService.getJwtSecret', () => {
  it('returns the configured JWT secret when present', () => {
    const service = makeService({
      JWT_SECRET: 'production-jwt-secret-1234567890',
      WORKER_ENTRYPOINT: 'main',
    });

    expect(service.getJwtSecret()).toBe('production-jwt-secret-1234567890');
  });

  it('returns the placeholder secret for worker entrypoints without JWT_SECRET', () => {
    const service = makeService({
      JWT_SECRET: undefined,
      WORKER_ENTRYPOINT: 'worker',
    });

    expect(service.getJwtSecret()).toBe(WORKER_JWT_MODULE_PLACEHOLDER_SECRET);
  });

  it('throws when the main API runtime has no JWT_SECRET', () => {
    const service = makeService({
      JWT_SECRET: undefined,
      WORKER_ENTRYPOINT: 'main',
    });

    expect(() => service.getJwtSecret()).toThrow(
      'JWT_SECRET is required for API runtime',
    );
  });
});

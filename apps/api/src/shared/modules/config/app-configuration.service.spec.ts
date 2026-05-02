import { describe, expect, it, jest } from '@jest/globals';
import { AppConfigService } from './app-configuration.service';
import { WORKER_JWT_MODULE_PLACEHOLDER_SECRET } from './app-config';

describe('AppConfigService.getJwtSecret', () => {
  it('returns the configured JWT secret when present', () => {
    const service = new AppConfigService();
    jest.spyOn(service, 'getConfig').mockReturnValue({
      JWT_SECRET: 'production-jwt-secret-1234567890',
      WORKER_ENTRYPOINT: 'main',
    } as ReturnType<AppConfigService['getConfig']>);

    expect(service.getJwtSecret()).toBe('production-jwt-secret-1234567890');
  });

  it('returns the placeholder secret for worker entrypoints without JWT_SECRET', () => {
    const service = new AppConfigService();
    jest.spyOn(service, 'getConfig').mockReturnValue({
      JWT_SECRET: undefined,
      WORKER_ENTRYPOINT: 'worker',
    } as ReturnType<AppConfigService['getConfig']>);

    expect(service.getJwtSecret()).toBe(WORKER_JWT_MODULE_PLACEHOLDER_SECRET);
  });

  it('throws when the main API runtime has no JWT_SECRET', () => {
    const service = new AppConfigService();
    jest.spyOn(service, 'getConfig').mockReturnValue({
      JWT_SECRET: undefined,
      WORKER_ENTRYPOINT: 'main',
    } as ReturnType<AppConfigService['getConfig']>);

    expect(() => service.getJwtSecret()).toThrow(
      'JWT_SECRET is required for API runtime',
    );
  });
});

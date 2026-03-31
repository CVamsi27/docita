import { StartupValidationService } from './startup-validation.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

type StartupValidationConfig = Pick<
  AppConfigService,
  | 'getEncryptionKey'
  | 'getJwtSecret'
  | 'getDatabaseUrl'
  | 'getEnvironment'
  | 'getAppUrl'
  | 'getFrontendAppUrl'
  | 'getApiUrl'
  | 'detectManagedDatabaseProvider'
>;

function createConfig(
  overrides: Partial<StartupValidationConfig> = {},
): StartupValidationConfig {
  return {
    getEncryptionKey: jest
      .fn()
      .mockReturnValue(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ),
    getJwtSecret: jest.fn().mockReturnValue('production-jwt-secret-1234567890'),
    getDatabaseUrl: jest
      .fn()
      .mockReturnValue('postgresql://user:password@db.example.com/docita'),
    getEnvironment: jest.fn().mockReturnValue('production'),
    getAppUrl: jest.fn().mockReturnValue('https://api.docita.work'),
    getFrontendAppUrl: jest.fn().mockReturnValue('https://app.docita.work'),
    getApiUrl: jest.fn().mockReturnValue('https://api.docita.work/api'),
    detectManagedDatabaseProvider: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

describe('StartupValidationService', () => {
  it('allows Render-managed database URLs without explicit tls flags', () => {
    const config = createConfig({
      getDatabaseUrl: jest
        .fn()
        .mockReturnValue(
          'postgresql://user:password@dpg-123.render.com/docita',
        ),
      detectManagedDatabaseProvider: jest.fn().mockReturnValue('Render'),
    });

    const service = new StartupValidationService(config as AppConfigService);

    expect(() => service.validate()).not.toThrow();
  });

  it('rejects production database URLs without tls flags when not on Render', () => {
    const config = createConfig();
    const service = new StartupValidationService(config as AppConfigService);

    expect(() => service.validate()).toThrow(
      'DATABASE_URL must enforce TLS in production',
    );
  });
});

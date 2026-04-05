import { StartupValidationService } from './startup-validation.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

type StartupValidationConfig = Pick<
  AppConfigService,
  | 'getEncryptionKey'
  | 'getJwtSecret'
  | 'getDatabaseUrl'
  | 'getEnvironment'
  | 'isProduction'
  | 'getAppUrl'
  | 'getFrontendAppUrl'
  | 'getApiUrl'
  | 'getStorageProvider'
  | 'getR2Config'
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
    isProduction: jest.fn().mockReturnValue(true),
    getAppUrl: jest.fn().mockReturnValue('https://api.docita.work'),
    getFrontendAppUrl: jest.fn().mockReturnValue('https://app.docita.work'),
    getApiUrl: jest.fn().mockReturnValue('https://api.docita.work/api'),
    getStorageProvider: jest.fn().mockReturnValue('r2'),
    getR2Config: jest.fn().mockReturnValue({
      accountId: 'test-account',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      bucketName: 'docita-storage',
    }),
    detectManagedDatabaseProvider: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

describe('StartupValidationService', () => {
  it('accepts production database URLs with sslmode=verify-full', () => {
    const config = createConfig({
      getDatabaseUrl: jest
        .fn()
        .mockReturnValue(
          'postgresql://user:password@db.example.com/docita?sslmode=verify-full',
        ),
    });

    const service = new StartupValidationService(config as AppConfigService);

    expect(() => service.validate()).not.toThrow();
  });

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

  it('allows Render private-networking database URLs (no render.com in hostname)', () => {
    // Render internal URLs use short hostnames like dpg-xxxxx-a with no domain.
    // detectManagedDatabaseProvider detects Render via RENDER=true env var.
    const config = createConfig({
      getDatabaseUrl: jest
        .fn()
        .mockReturnValue('postgresql://user:password@dpg-abc123-a/docita'),
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

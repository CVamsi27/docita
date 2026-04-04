import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class StartupValidationService {
  private readonly logger = new Logger(StartupValidationService.name);

  constructor(private configService: AppConfigService) {}

  validate(): void {
    this.logger.debug('Running startup validations...');

    this.validateEncryptionKey();
    this.validateJwtSecret();
    this.validateDatabaseConfiguration();
    this.validateTransportSecurity();
    this.validateDataAtRestControls();
    this.validateProductionStorageConfiguration();
    this.validateProductionSecrets();

    this.logger.log('All startup validations passed');
  }

  private validateEncryptionKey(): void {
    const encryptionKey = this.configService.getEncryptionKey();
    const nodeEnv = this.configService.getEnvironment();

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not set in environment variables');
    }

    if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
      throw new Error(
        'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (256-bit). ' +
          'Current length: ' +
          encryptionKey.length,
      );
    }

    if (nodeEnv === 'production') {
      const weakKeyPatterns: RegExp[] = [
        /^0+$/i,
        /^f+$/i,
        /^(01)+$/i,
        /^123456789abcdef0/,
      ];

      if (
        weakKeyPatterns.some((pattern) =>
          pattern.test(encryptionKey.toLowerCase()),
        )
      ) {
        throw new Error(
          'ENCRYPTION_KEY appears to be a weak or default key. ' +
            'Generate a cryptographically secure key: ' +
            "node -e \"process.stdout.write(require('crypto').randomBytes(32).toString('hex'))\"",
        );
      }

      this.logger.log('ENCRYPTION_KEY validated (production-strength)');
    } else {
      this.logger.debug('ENCRYPTION_KEY validated (development mode)');
    }
  }

  private validateJwtSecret(): void {
    const jwtSecret = this.configService.getJwtSecret();
    const nodeEnv = this.configService.getEnvironment();

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }

    const minLength = 32;
    if (jwtSecret.length < minLength) {
      throw new Error(
        `JWT_SECRET must be at least ${minLength} characters. Current length: ${jwtSecret.length}`,
      );
    }

    if (
      jwtSecret.toLowerCase() === 'dev-only-secret-do-not-use-in-prod' ||
      jwtSecret === 'test-secret'
    ) {
      throw new Error(
        'JWT_SECRET is set to a hardcoded test value. ' +
          'Generate a secure secret: ' +
          "node -e \"process.stdout.write(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    if (nodeEnv === 'production') {
      this.logger.log('JWT_SECRET validated (production-strength)');
    } else {
      this.logger.debug(' JWT_SECRET validated');
    }
  }

  private validateDatabaseConfiguration(): void {
    const databaseUrl = this.configService.getDatabaseUrl();

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    const nodeEnv = this.configService.getEnvironment();
    if (nodeEnv === 'production') {
      if (
        databaseUrl.includes('localhost') ||
        databaseUrl.includes('127.0.0.1')
      ) {
        throw new Error(
          'DATABASE_URL in production is pointing to localhost. ' +
            'Use a remote database URL.',
        );
      }

      if (databaseUrl.includes(':5434@localhost')) {
        throw new Error(
          'DATABASE_URL in production cannot use local PostgreSQL. ' +
            'Configure a production database instance.',
        );
      }

      const normalizedUrl = databaseUrl.toLowerCase();
      let sslMode: string | null = null;

      try {
        sslMode = new URL(databaseUrl).searchParams.get('sslmode');
      } catch {
        // Keep substring fallback for non-standard connection string formats.
      }

      const hasDbTlsEnabled =
        sslMode === 'require' ||
        sslMode === 'verify-ca' ||
        sslMode === 'verify-full' ||
        normalizedUrl.includes('sslmode=require') ||
        normalizedUrl.includes('sslmode=verify-ca') ||
        normalizedUrl.includes('sslmode=verify-full') ||
        normalizedUrl.includes('ssl=true') ||
        normalizedUrl.includes('sslaccept=strict');

      if (!hasDbTlsEnabled) {
        const provider = this.configService.detectManagedDatabaseProvider();

        if (provider === 'Render') {
          this.logger.log(
            'DATABASE_URL validated for Render private networking',
          );
          return;
        }

        throw new Error(
          'DATABASE_URL must enforce TLS in production (for example add sslmode=require).',
        );
      }

      this.logger.log('DATABASE_URL validated (production)');
    } else {
      this.logger.debug(' DATABASE_URL validated');
    }
  }

  private validateTransportSecurity(): void {
    const nodeEnv = this.configService.getEnvironment();
    if (nodeEnv !== 'production') {
      return;
    }

    const appUrl = this.configService.getAppUrl();
    const publicAppUrl = this.configService.getFrontendAppUrl();
    const publicApiUrl = this.configService.getApiUrl();

    const urlsToValidate = [appUrl, publicAppUrl, publicApiUrl].filter(Boolean);

    urlsToValidate.forEach((url) => {
      if (!url.startsWith('https://')) {
        throw new Error(
          `All runtime URLs must use HTTPS in production. Invalid URL: ${url}`,
        );
      }
    });

    this.logger.log('Transport security validated (HTTPS endpoints)');
  }

  private validateDataAtRestControls(): void {
    const nodeEnv = this.configService.getEnvironment();
    if (nodeEnv !== 'production') {
      return;
    }

    const provider = this.configService.detectManagedDatabaseProvider();

    if (provider) {
      this.logger.log(
        `Data-at-rest encryption auto-confirmed (managed provider: ${provider})`,
      );
    } else {
      this.logger.warn(
        'Could not auto-detect a managed cloud database provider. ' +
          'Ensure provider-level disk/storage encryption is enabled for your database.',
      );
    }
  }

  private validateProductionSecrets(): void {
    const nodeEnv = this.configService.getEnvironment();

    if (nodeEnv !== 'production') {
      return;
    }

    const missing: string[] = [];

    if (!this.configService.getDatabaseUrl()) missing.push('DATABASE_URL');
    if (!this.configService.getJwtSecret()) missing.push('JWT_SECRET');
    if (!this.configService.getEncryptionKey()) missing.push('ENCRYPTION_KEY');

    if (missing.length > 0) {
      throw new Error(
        `Missing required production secrets: ${missing.join(', ')}. ` +
          'All critical secrets must be set in production environment.',
      );
    }

    this.logger.log('All production secrets validated');
  }

  private validateProductionStorageConfiguration(): void {
    if (!this.configService.isProduction()) {
      return;
    }

    const storageProvider = this.configService.getStorageProvider();
    if (storageProvider !== 'r2') {
      throw new Error(
        'STORAGE_PROVIDER must be set to "r2" in production to avoid local document storage.',
      );
    }

    const r2Config = this.configService.getR2Config();
    const missing = [];
    if (!r2Config.accountId) missing.push('R2_ACCOUNT_ID');
    if (!r2Config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!r2Config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
    if (!r2Config.bucketName) missing.push('R2_BUCKET_NAME');

    if (missing.length > 0) {
      throw new Error(
        `Missing required R2 configuration for production: ${missing.join(', ')}`,
      );
    }

    this.logger.log('Production storage configuration validated (R2)');
  }

  getEncryptionKeyInfo(): {
    isSet: boolean;
    length: number;
    lastChars: string;
  } {
    const key = this.configService.getEncryptionKey();
    return {
      isSet: !!key,
      length: key.length,
      lastChars: key.slice(-4),
    };
  }
}

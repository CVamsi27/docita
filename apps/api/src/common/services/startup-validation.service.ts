import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service to validate critical configuration at application startup
 * Ensures encryption keys, secrets, and other critical config meet production standards
 */
@Injectable()
export class StartupValidationService {
  private readonly logger = new Logger(StartupValidationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Run all startup validations
   * Call this from app bootstrap before starting the server
   * @throws Error if any validation fails
   */
  async validate(): Promise<void> {
    this.logger.debug('Running startup validations...');

    this.validateEncryptionKey();
    this.validateJwtSecret();
    this.validateDatabaseConfiguration();
    this.validateProductionSecrets();

    this.logger.log('✅ All startup validations passed');
  }

  /**
   * Validate ENCRYPTION_KEY meets production standards
   * @throws Error if validation fails
   */
  private validateEncryptionKey(): void {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not set in environment variables');
    }

    // Validate hex format and length
    if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
      throw new Error(
        'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (256-bit). ' +
        'Current length: ' + encryptionKey.length,
      );
    }

    // In production, require strong entropy (not default/test keys)
    if (nodeEnv === 'production') {
      const weakKeyPatterns = [
        /^0+$/, // All zeros
        /^f+$/i, // All 'f'
        /^(01)+$/i, // Repeating pattern
        /^123456789abcdef0/.test(encryptionKey.toLowerCase()), // Sequential
      ];

      if (weakKeyPatterns.some((pattern) => pattern.test?.(encryptionKey))) {
        throw new Error(
          'ENCRYPTION_KEY appears to be a weak or default key. ' +
          'Generate a cryptographically secure key: ' +
          'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
        );
      }

      this.logger.log('✓ ENCRYPTION_KEY validated (production-strength)');
    } else {
      this.logger.debug('✓ ENCRYPTION_KEY validated (development mode)');
    }
  }

  /**
   * Validate JWT_SECRET meets production standards
   * @throws Error if validation fails
   */
  private validateJwtSecret(): void {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }

    // Minimum length check
    const minLength = nodeEnv === 'production' ? 32 : 16;
    if (jwtSecret.length < minLength) {
      throw new Error(
        `JWT_SECRET must be at least ${minLength} characters. Current length: ${jwtSecret.length}`,
      );
    }

    // Check for hardcoded/test values
    if (
      jwtSecret.toLowerCase() === 'dev-only-secret-do-not-use-in-prod' ||
      jwtSecret === 'test-secret'
    ) {
      throw new Error(
        'JWT_SECRET is set to a hardcoded test value. ' +
        'Generate a secure secret: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }

    if (nodeEnv === 'production') {
      this.logger.log('✓ JWT_SECRET validated (production-strength)');
    } else {
      this.logger.debug('✓ JWT_SECRET validated');
    }
  }

  /**
   * Validate DATABASE_URL is properly configured
   * @throws Error if validation fails
   */
  private validateDatabaseConfiguration(): void {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    // Ensure it's not pointing to test/dev database in production
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'production') {
      if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
        throw new Error(
          'DATABASE_URL in production is pointing to localhost. ' +
          'Use a remote database URL.',
        );
      }

      if (databaseUrl.includes(':5432@localhost')) {
        throw new Error(
          'DATABASE_URL in production cannot use local PostgreSQL. ' +
          'Configure a production database instance.',
        );
      }

      this.logger.log('✓ DATABASE_URL validated (production)');
    } else {
      this.logger.debug('✓ DATABASE_URL validated');
    }
  }

  /**
   * Validate production-specific secrets are set
   * @throws Error if validation fails in production
   */
  private validateProductionSecrets(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv !== 'production') {
      return; // Skip in non-production environments
    }

    const requiredProduction = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
    const missing: string[] = [];

    requiredProduction.forEach((key) => {
      const value = this.configService.get<string>(key);
      if (!value || value.length === 0) {
        missing.push(key);
      }
    });

    if (missing.length > 0) {
      throw new Error(
        `Missing required production secrets: ${missing.join(', ')}. ` +
        'All critical secrets must be set in production environment.',
      );
    }

    this.logger.log('✓ All production secrets validated');
  }

  /**
   * Get encryption key info for diagnostics (non-sensitive)
   */
  getEncryptionKeyInfo(): {
    isSet: boolean;
    length: number;
    lastChars: string;
  } {
    const key = this.configService.get<string>('ENCRYPTION_KEY', '');
    return {
      isSet: !!key,
      length: key.length,
      lastChars: key.slice(-4), // Only show last 4 chars
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StartupValidationService {
  private readonly logger = new Logger(StartupValidationService.name);

  constructor(private configService: ConfigService) {}

  validate(): void {
    this.logger.debug('Running startup validations...');

    this.validateEncryptionKey();
    this.validateJwtSecret();
    this.validateDatabaseConfiguration();
    this.validateProductionSecrets();

    this.logger.log(' All startup validations passed');
  }

  private validateEncryptionKey(): void {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

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

      this.logger.log(' ENCRYPTION_KEY validated (production-strength)');
    } else {
      this.logger.debug(' ENCRYPTION_KEY validated (development mode)');
    }
  }

  private validateJwtSecret(): void {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }

    const minLength = nodeEnv === 'production' ? 32 : 16;
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
      this.logger.log(' JWT_SECRET validated (production-strength)');
    } else {
      this.logger.debug(' JWT_SECRET validated');
    }
  }

  private validateDatabaseConfiguration(): void {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
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

      if (databaseUrl.includes(':5432@localhost')) {
        throw new Error(
          'DATABASE_URL in production cannot use local PostgreSQL. ' +
            'Configure a production database instance.',
        );
      }

      this.logger.log(' DATABASE_URL validated (production)');
    } else {
      this.logger.debug(' DATABASE_URL validated');
    }
  }

  private validateProductionSecrets(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv !== 'production') {
      return;
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

    this.logger.log(' All production secrets validated');
  }

  getEncryptionKeyInfo(): {
    isSet: boolean;
    length: number;
    lastChars: string;
  } {
    const key = this.configService.get<string>('ENCRYPTION_KEY', '');
    return {
      isSet: !!key,
      length: key.length,
      lastChars: key.slice(-4),
    };
  }
}

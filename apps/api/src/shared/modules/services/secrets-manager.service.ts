import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class SecretsManagerService {
  private readonly logger = new Logger(SecretsManagerService.name);
  private secretsCache: Map<string, { value: string; expiresAt: number }> =
    new Map();
  private readonly CACHE_TTL_MS = 3600000;

  constructor(private configService: AppConfigService) {
    this.initializeSecretsProvider();
  }

  private getEnvSecret(secretName: string): string | undefined {
    const config = this.configService.getConfig();
    const value = Reflect.get(config, secretName);
    return typeof value === 'string' ? value : undefined;
  }

  private initializeSecretsProvider(): void {
    const nodeEnv = this.configService.getEnvironment();
    const secretsProvider = this.configService.getSecretsProvider();

    if (nodeEnv === 'production' && secretsProvider !== 'env') {
      this.logger.log(
        `Initialized secrets provider: ${secretsProvider.toUpperCase()}`,
      );
    } else {
      this.logger.debug('Using environment variables for secrets');
    }
  }

  getSecret(
    secretName: string,
    options?: { cached?: boolean; ttl?: number },
  ): string | undefined {
    const { cached = true, ttl = this.CACHE_TTL_MS } = options || {};

    if (cached && this.secretsCache.has(secretName)) {
      const cached = this.secretsCache.get(secretName);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Secret ${secretName} retrieved from cache`);
        return cached.value;
      } else {
        this.secretsCache.delete(secretName);
      }
    }

    let secretValue: string | undefined;

    const provider = this.configService.getSecretsProvider();

    if (provider === 'aws') {
      secretValue = this.getFromAwsSecretsManager(secretName);
    } else {
      secretValue = this.getEnvSecret(secretName);
    }

    if (secretValue && cached) {
      this.secretsCache.set(secretName, {
        value: secretValue,
        expiresAt: Date.now() + ttl,
      });
    }

    return secretValue;
  }

  getSecrets(
    secretNames: string[],
    options?: { cached?: boolean },
  ): Record<string, string | undefined> {
    const secrets = secretNames.map((name) => this.getSecret(name, options));

    return Object.fromEntries(
      secretNames.map((name, index) => [name, secrets[index]]),
    );
  }

  private getFromAwsSecretsManager(secretName: string): string | undefined {
    try {
      this.logger.warn(
        `AWS Secrets Manager integration not yet implemented for ${secretName}`,
      );
      return this.getEnvSecret(secretName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch secret from AWS Secrets Manager: ${errorMsg}`,
      );
      return this.getEnvSecret(secretName);
    }
  }

  private getFromHashiCorpVault(secretName: string): string | undefined {
    try {
      this.logger.warn(
        `HashiCorp Vault integration not yet implemented for ${secretName}`,
      );
      return this.getEnvSecret(secretName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch secret from HashiCorp Vault: ${errorMsg}`,
      );
      return this.getEnvSecret(secretName);
    }
  }

  validateRequiredSecrets(requiredSecrets: string[]): void {
    const missing: string[] = [];

    for (const secretName of requiredSecrets) {
      const value = this.getSecret(secretName);
      if (!value) {
        missing.push(secretName);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required secrets: ${missing.join(', ')}. ` +
          'Please ensure all critical secrets are configured in your secrets provider.',
      );
    }

    this.logger.log(
      ` All ${requiredSecrets.length} required secrets validated`,
    );
  }

  clearCache(secretName?: string): void {
    if (secretName) {
      this.secretsCache.delete(secretName);
      this.logger.debug(`Cleared cache for secret: ${secretName}`);
    } else {
      this.secretsCache.clear();
      this.logger.debug('Cleared all secrets cache');
    }
  }

  rotateSecret(secretName: string): void {
    this.logger.log(`Rotating secret: ${secretName}`);

    this.clearCache(secretName);
  }

  getSecretsMetadata(): {
    provider: string;
    cachedSecrets: number;
    cacheSize: number;
  } {
    return {
      provider: this.configService.getSecretsProvider(),
      cachedSecrets: this.secretsCache.size,
      cacheSize: this.calculateCacheSize(),
    };
  }

  private calculateCacheSize(): number {
    let size = 0;
    for (const [key, value] of this.secretsCache) {
      size += key.length + (value?.value?.length || 0);
    }
    return size;
  }
}

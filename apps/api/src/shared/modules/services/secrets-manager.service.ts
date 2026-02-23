import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Secrets Manager Service
 * Abstracts secrets management to support multiple providers (AWS SSM, HashiCorp Vault, etc.)
 * In development/local, uses environment variables
 * In production, can use AWS Secrets Manager or similar
 */
@Injectable()
export class SecretsManagerService {
  private readonly logger = new Logger(SecretsManagerService.name);
  private secretsCache: Map<string, { value: string; expiresAt: number }> =
    new Map();
  private readonly CACHE_TTL_MS = 3600000; // 1 hour

  constructor(private configService: ConfigService) {
    this.initializeSecretsProvider();
  }

  /**
   * Initialize the secrets provider based on environment
   */
  private initializeSecretsProvider(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const secretsProvider = this.configService.get<string>(
      'SECRETS_PROVIDER',
      'env',
    );

    if (nodeEnv === 'production' && secretsProvider !== 'env') {
      this.logger.log(
        `Initialized secrets provider: ${secretsProvider.toUpperCase()}`,
      );
    } else {
      this.logger.debug('Using environment variables for secrets');
    }
  }

  /**
   * Get a secret value
   * Returns from cache if valid, otherwise fetches from provider
   */
  getSecret(
    secretName: string,
    options?: { cached?: boolean; ttl?: number },
  ): string | undefined {
    const { cached = true, ttl = this.CACHE_TTL_MS } = options || {};

    // Check cache first
    if (cached && this.secretsCache.has(secretName)) {
      const cached = this.secretsCache.get(secretName);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Secret ${secretName} retrieved from cache`);
        return cached.value;
      } else {
        this.secretsCache.delete(secretName);
      }
    }

    // Fetch from provider
    let secretValue: string | undefined;

    const provider = this.configService.get<string>('SECRETS_PROVIDER', 'env');

    if (provider === 'aws-secrets-manager') {
      secretValue = this.getFromAwsSecretsManager(secretName);
    } else if (provider === 'vault') {
      secretValue = this.getFromHashiCorpVault(secretName);
    } else {
      // Default: environment variables
      secretValue = this.configService.get<string>(secretName);
    }

    // Cache the result
    if (secretValue && cached) {
      this.secretsCache.set(secretName, {
        value: secretValue,
        expiresAt: Date.now() + ttl,
      });
    }

    return secretValue;
  }

  /**
   * Get multiple secrets at once
   */
  getSecrets(
    secretNames: string[],
    options?: { cached?: boolean },
  ): Record<string, string | undefined> {
    const secrets = secretNames.map((name) => this.getSecret(name, options));

    return secretNames.reduce(
      (acc, name, index) => {
        acc[name] = secrets[index];
        return acc;
      },
      {} as Record<string, string | undefined>,
    );
  }

  /**
   * Fetch secret from AWS Secrets Manager
   * Requires AWS SDK and proper IAM permissions
   */
  private getFromAwsSecretsManager(secretName: string): string | undefined {
    try {
      // AWS Secrets Manager integration would go here
      // This requires: import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
      // For now, return undefined to fallback to environment variables

      this.logger.warn(
        `AWS Secrets Manager integration not yet implemented for ${secretName}`,
      );
      return this.configService.get<string>(secretName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch secret from AWS Secrets Manager: ${errorMsg}`,
      );
      // Fallback to environment variables
      return this.configService.get<string>(secretName);
    }
  }

  /**
   * Fetch secret from HashiCorp Vault
   * Requires Vault server and proper authentication
   */
  private getFromHashiCorpVault(secretName: string): string | undefined {
    try {
      // HashiCorp Vault integration would go here
      // This requires: import * as Vault from 'node-vault';
      // For now, return undefined to fallback to environment variables

      this.logger.warn(
        `HashiCorp Vault integration not yet implemented for ${secretName}`,
      );
      return this.configService.get<string>(secretName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch secret from HashiCorp Vault: ${errorMsg}`,
      );
      // Fallback to environment variables
      return this.configService.get<string>(secretName);
    }
  }

  /**
   * Validate that critical secrets are available
   * Call this at startup to ensure all required secrets are set
   */
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
      `✓ All ${requiredSecrets.length} required secrets validated`,
    );
  }

  /**
   * Clear cache for a specific secret or all secrets
   */
  clearCache(secretName?: string): void {
    if (secretName) {
      this.secretsCache.delete(secretName);
      this.logger.debug(`Cleared cache for secret: ${secretName}`);
    } else {
      this.secretsCache.clear();
      this.logger.debug('Cleared all secrets cache');
    }
  }

  /**
   * Rotate a secret (future enhancement)
   * Will trigger secret rotation in the provider
   */
  rotateSecret(secretName: string): void {
    this.logger.log(`Rotating secret: ${secretName}`);

    // Clear cache to force refresh
    this.clearCache(secretName);

    // In the future, this would trigger actual rotation in AWS/Vault
    // For now, just clear the cache and log
  }

  /**
   * Get secrets metadata (non-sensitive information)
   */
  getSecretsMetadata(): {
    provider: string;
    cachedSecrets: number;
    cacheSize: number;
  } {
    return {
      provider:
        this.configService.get<string>('SECRETS_PROVIDER', 'env') || 'env',
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

import { Injectable } from '@nestjs/common';
import {
  WORKER_JWT_MODULE_PLACEHOLDER_SECRET,
  getEnv,
  type EnvConfig,
} from './app-config';
import { getJwtSecretFromConfig } from './app-configuration-values';

@Injectable()
export class AuthSecurityConfigService {
  getConfig(): EnvConfig {
    return getEnv();
  }

  getJwtSecret(): string {
    const config = this.getConfig();
    return getJwtSecretFromConfig({
      jwtSecret: config.JWT_SECRET,
      workerEntrypoint: config.WORKER_ENTRYPOINT,
      workerPlaceholderSecret: WORKER_JWT_MODULE_PLACEHOLDER_SECRET,
    });
  }

  getJwtExpiration(): string {
    return this.getConfig().JWT_EXPIRATION ?? '15m';
  }

  getEncryptionKey(): string {
    return this.getConfig().ENCRYPTION_KEY;
  }

  getHistoricalEncryptionKeys(): Record<string, string | undefined> {
    const config = this.getConfig();
    return {
      v2: config.ENCRYPTION_KEY_V2,
      v3: config.ENCRYPTION_KEY_V3,
      v4: config.ENCRYPTION_KEY_V4,
      v5: config.ENCRYPTION_KEY_V5,
    };
  }

  getPublicDocumentSigningSecret(): string {
    return this.getConfig().PUBLIC_DOCUMENT_SIGNING_SECRET ?? this.getJwtSecret();
  }

  getTurnstileSecretKey(): string | undefined {
    const key = this.getConfig().TURNSTILE_SECRET_KEY;
    return key && key.length > 0 ? key : undefined;
  }

  isTurnstileEnforced(): boolean {
    return Boolean(this.getTurnstileSecretKey());
  }

  getSecretsProvider(): 'env' | 'aws' {
    return this.getConfig().SECRETS_PROVIDER;
  }
}

import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';
import { shouldBypassGuardForE2eConfig } from './app-configuration-values';

@Injectable()
export class EnvironmentConfigService {
  getEnvironment(): 'development' | 'staging' | 'production' | 'test' {
    return getEnv().NODE_ENV;
  }

  isProduction(): boolean {
    return getEnv().NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  isApiE2eEnabled(): boolean {
    return getEnv().DOCITA_API_E2E === 'true';
  }

  shouldAllowTestEmailAutoVerify(): boolean {
    return getEnv().ALLOW_TEST_EMAIL_AUTOVERIFY;
  }

  shouldBypassGuardForE2e(e2eHeaderValue: string | undefined): boolean {
    return shouldBypassGuardForE2eConfig({
      isProduction: this.isProduction(),
      apiE2eEnabled: this.isApiE2eEnabled(),
      e2eHeaderValue,
    });
  }

  getCpuCount(): number {
    return getEnv().CPU_COUNT;
  }
}

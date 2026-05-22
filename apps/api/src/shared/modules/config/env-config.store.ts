import type { EnvConfig } from './app-config';

/**
 * Holds validated env after bootstrap. Used by validateEnv/getEnv before Nest DI
 * and by AppConfigurationService via getEnv().
 */
export class EnvConfigStore {
  private static cached: EnvConfig | null = null;

  static getCached(): EnvConfig | null {
    return this.cached;
  }

  static setCached(config: EnvConfig): void {
    this.cached = config;
  }

  /** Test-only: reset module cache between dynamic imports. */
  static resetForTests(): void {
    this.cached = null;
  }
}

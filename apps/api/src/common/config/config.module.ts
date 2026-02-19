/**
 * Configuration Module
 *
 * Provides centralized access to application configuration throughout the app.
 * Validates all environment variables at startup.
 *
 * Usage in other modules:
 * ```typescript
 * import { ConfigModule } from '.../common/config/config.module';
 *
 * @Module({
 *   imports: [ConfigModule], // Already global, but can be imported explicitly
 *   ...
 * })
 * ```
 *
 * Usage in services:
 * ```typescript
 * constructor(private configService: AppConfigService) {}
 * ```
 */

import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-configuration.service';
import { validateEnv } from './app-config';

@Global()
@Module({
  providers: [
    {
      provide: AppConfigService,
      useFactory: () => {
        // Validate environment variables at module initialization
        validateEnv();
        return new AppConfigService();
      },
    },
  ],
  exports: [AppConfigService],
})
export class AppConfigModule {}

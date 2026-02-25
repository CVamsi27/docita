import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-configuration.service';
import { validateEnv } from './app-config';

@Global()
@Module({
  providers: [
    {
      provide: AppConfigService,
      useFactory: () => {
        validateEnv();
        return new AppConfigService();
      },
    },
  ],
  exports: [AppConfigService],
})
export class AppConfigModule {}

import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-configuration.service';
import { EnvironmentConfigService } from './environment-config.service';
import { AppUrlConfigService } from './app-url-config.service';
import { StorageConfigService } from './storage-config.service';
import { AuthSecurityConfigService } from './auth-security-config.service';
import { CommunicationConfigService } from './communication-config.service';
import { PaymentConfigService } from './payment-config.service';
import { PlatformInfrastructureConfigService } from './platform-infrastructure-config.service';
import { ExternalIntegrationsConfigService } from './external-integrations-config.service';
import { validateEnv } from './app-config';

@Global()
@Module({
  providers: [
    {
      provide: AppConfigService,
      useFactory: (
        environment: EnvironmentConfigService,
        appUrl: AppUrlConfigService,
        storage: StorageConfigService,
        authSecurity: AuthSecurityConfigService,
        communication: CommunicationConfigService,
        payment: PaymentConfigService,
        platform: PlatformInfrastructureConfigService,
        externalIntegrations: ExternalIntegrationsConfigService,
      ) => {
        validateEnv();
        return new AppConfigService(
          environment,
          appUrl,
          storage,
          authSecurity,
          communication,
          payment,
          platform,
          externalIntegrations,
        );
      },
      inject: [
        EnvironmentConfigService,
        AppUrlConfigService,
        StorageConfigService,
        AuthSecurityConfigService,
        CommunicationConfigService,
        PaymentConfigService,
        PlatformInfrastructureConfigService,
        ExternalIntegrationsConfigService,
      ],
    },
    EnvironmentConfigService,
    AppUrlConfigService,
    StorageConfigService,
    AuthSecurityConfigService,
    CommunicationConfigService,
    PaymentConfigService,
    PlatformInfrastructureConfigService,
    ExternalIntegrationsConfigService,
  ],
  exports: [
    AppConfigService,
    EnvironmentConfigService,
    AppUrlConfigService,
    StorageConfigService,
    AuthSecurityConfigService,
    CommunicationConfigService,
    PaymentConfigService,
    PlatformInfrastructureConfigService,
    ExternalIntegrationsConfigService,
  ],
})
export class AppConfigModule {}

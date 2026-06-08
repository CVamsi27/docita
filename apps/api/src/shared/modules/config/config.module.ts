import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-configuration.service';
import { EnvironmentConfigService } from './environment-config.service';
import { AppUrlConfigService } from './app-url-config.service';
import { StorageConfigService } from './storage-config.service';
import { AuthSecurityConfigService } from './auth-security-config.service';
import { CommunicationConfigService } from './communication-config.service';
import { EmailConfigService } from './email-config.service';
import { SmsConfigService } from './sms-config.service';
import { WhatsappConfigService } from './whatsapp-config.service';
import { PaymentConfigService } from './payment-config.service';
import { RazorpayConfigService } from './razorpay-config.service';
import { OpsConfigService } from './ops-config.service';
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
    {
      provide: CommunicationConfigService,
      useFactory: (
        email: EmailConfigService,
        sms: SmsConfigService,
        whatsapp: WhatsappConfigService,
      ) => new CommunicationConfigService(email, sms, whatsapp),
      inject: [EmailConfigService, SmsConfigService, WhatsappConfigService],
    },
    EmailConfigService,
    SmsConfigService,
    WhatsappConfigService,
    {
      provide: PaymentConfigService,
      useFactory: (razorpay: RazorpayConfigService, ops: OpsConfigService) =>
        new PaymentConfigService(razorpay, ops),
      inject: [RazorpayConfigService, OpsConfigService],
    },
    RazorpayConfigService,
    OpsConfigService,
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
    EmailConfigService,
    SmsConfigService,
    WhatsappConfigService,
    PaymentConfigService,
    RazorpayConfigService,
    OpsConfigService,
    PlatformInfrastructureConfigService,
    ExternalIntegrationsConfigService,
  ],
})
export class AppConfigModule {}

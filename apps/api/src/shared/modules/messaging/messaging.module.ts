import { Module } from '@nestjs/common';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { MessageTemplateService } from './templates';
import { NotificationOrchestrator } from './notification-orchestrator.service';
import { WhatsAppChannel, EmailChannel, SmsChannel } from './channels';
import { NotificationsModule } from './notifications/notifications.module';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import type { IClock } from '@/shared/common/ports/clock.port';

@Module({
  imports: [AppConfigModule, NotificationsModule, WhatsappModule],
  providers: [
    MessageTemplateService,
    NotificationOrchestrator,

    {
      provide: WhatsAppChannel,
      useFactory: (configService: AppConfigService, clock: IClock) => {
        const metaConfig = configService.getMetaConfig();
        return new WhatsAppChannel(
          metaConfig.phoneNumberId,
          metaConfig.accessToken,
          metaConfig.businessAccountId,
          clock,
        );
      },
      inject: [AppConfigService, CLOCK_PORT],
    },
    {
      provide: EmailChannel,
      useFactory: (configService: AppConfigService, clock: IClock) => {
        const smtpConfig = configService.getSmtpConfig();
        return new EmailChannel(
          {
            host: smtpConfig.host,
            port: smtpConfig.port,
            user: smtpConfig.user,
            pass: smtpConfig.pass,
          },
          clock,
        );
      },
      inject: [AppConfigService, CLOCK_PORT],
    },
    {
      provide: SmsChannel,
      useFactory: (configService: AppConfigService, clock: IClock) => {
        const smsConfig = configService.getSmsConfig();
        return new SmsChannel(
          {
            apiKey: smsConfig.apiKey,
            senderId: smsConfig.senderId,
          },
          clock,
        );
      },
      inject: [AppConfigService, CLOCK_PORT],
    },
  ],
  exports: [
    NotificationOrchestrator,
    MessageTemplateService,
    NotificationsModule,
  ],
})
export class MessagingModule {}

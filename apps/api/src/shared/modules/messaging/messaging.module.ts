import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-configuration.service';
import { MessageTemplateService } from './templates';
import { NotificationOrchestrator } from './notification-orchestrator.service';
import { WhatsAppChannel, EmailChannel, SmsChannel } from './channels';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [AppConfigModule, NotificationsModule],
  providers: [
    MessageTemplateService,
    NotificationOrchestrator,

    {
      provide: WhatsAppChannel,
      useFactory: (configService: AppConfigService) => {
        const metaConfig = configService.getMetaConfig();
        return new WhatsAppChannel(
          metaConfig.phoneNumberId,
          metaConfig.accessToken,
          metaConfig.businessAccountId,
        );
      },
      inject: [AppConfigService],
    },
    {
      provide: EmailChannel,
      useFactory: (configService: AppConfigService) => {
        const smtpConfig = configService.getSmtpConfig();
        return new EmailChannel({
          host: smtpConfig.host,
          port: smtpConfig.port,
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        });
      },
      inject: [AppConfigService],
    },
    {
      provide: SmsChannel,
      useFactory: (configService: AppConfigService) => {
        const smsConfig = configService.getSmsConfig();
        return new SmsChannel({
          apiKey: smsConfig.apiKey,
          senderId: smsConfig.senderId,
        });
      },
      inject: [AppConfigService],
    },
  ],
  exports: [
    NotificationOrchestrator,
    MessageTemplateService,
    NotificationsModule,
  ],
})
export class MessagingModule {}

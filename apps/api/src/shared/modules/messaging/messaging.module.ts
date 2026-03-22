import { Module } from '@nestjs/common';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { MessageTemplateService } from './templates';
import { NotificationOrchestrator } from './notification-orchestrator.service';
import { WhatsAppChannel, EmailChannel, SmsChannel } from './channels';
import { NotificationsModule } from './notifications/notifications.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [AppConfigModule, NotificationsModule, WhatsappModule],
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

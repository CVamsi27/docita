import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageTemplateService } from './templates';
import { NotificationOrchestrator } from './notification-orchestrator.service';
import { WhatsAppChannel, EmailChannel, SmsChannel } from './channels';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [ConfigModule, NotificationsModule],
  providers: [
    MessageTemplateService,
    NotificationOrchestrator,

    {
      provide: WhatsAppChannel,
      useFactory: (configService: ConfigService) => {
        return new WhatsAppChannel(
          configService.get<string>('META_PHONE_NUMBER_ID', ''),
          configService.get<string>('META_ACCESS_TOKEN', ''),
          configService.get<string>('META_BUSINESS_ACCOUNT_ID', ''),
        );
      },
      inject: [ConfigService],
    },
    {
      provide: EmailChannel,
      useFactory: (configService: ConfigService) => {
        return new EmailChannel({
          host: configService.get<string>('SMTP_HOST', 'localhost'),
          port: configService.get<number>('SMTP_PORT', 587),
          user: configService.get<string>('SMTP_USER', ''),
          pass: configService.get<string>('SMTP_PASS', ''),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: SmsChannel,
      useFactory: (configService: ConfigService) => {
        return new SmsChannel({
          apiKey: configService.get<string>('SMS_API_KEY', ''),
          senderId: configService.get<string>('SMS_SENDER_ID', ''),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    NotificationOrchestrator,
    MessageTemplateService,
    NotificationsModule,
  ],
})
export class MessagingModule {}

import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailEventsListener } from './email-events.listener';
import { EmailSuppressionService } from './email-suppression.service';
import { ZeptoMailWebhookController } from './zeptomail-webhook.controller';
import {
  ConsoleEmailProvider,
  ZeptoMailEmailProvider,
  EMAIL_PROVIDER,
} from './providers';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { WebhooksModule } from '@/shared/modules/webhooks';

@Module({
  imports: [PrismaModule, WebhooksModule],
  controllers: [ZeptoMailWebhookController],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: AppConfigService) => {
        if (configService.getZeptoMailSendMailToken()) {
          return new ZeptoMailEmailProvider(configService);
        }
        return new ConsoleEmailProvider();
      },
      inject: [AppConfigService],
    },
    EmailService,
    EmailSuppressionService,
    EmailEventsListener,
  ],
  exports: [EmailService, EmailSuppressionService],
})
export class EmailModule {}

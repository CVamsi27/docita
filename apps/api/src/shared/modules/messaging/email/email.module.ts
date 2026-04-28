import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailEventsListener } from './email-events.listener';
import {
  ConsoleEmailProvider,
  ZeptoMailEmailProvider,
  EMAIL_PROVIDER,
} from './providers';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Module({
  imports: [PrismaModule],
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
    EmailEventsListener,
  ],
  exports: [EmailService],
})
export class EmailModule {}

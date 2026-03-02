import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailEventsListener } from './email-events.listener';
import {
  ConsoleEmailProvider,
  ResendEmailProvider,
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
        if (configService.getResendApiKey()) {
          return new ResendEmailProvider(configService);
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

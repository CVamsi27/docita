import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailEventsListener } from './email-events.listener';
import {
  ConsoleEmailProvider,
  ResendEmailProvider,
  EMAIL_PROVIDER,
} from './providers';
import { PrismaModule } from '../../../prisma/prisma.module';

/**
 * Email module providing email delivery capabilities.
 * Uses Resend in production, Console in development.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: () => {
        // Use Resend in production when API key is available
        if (process.env.RESEND_API_KEY) {
          return new ResendEmailProvider();
        }
        // Fall back to console provider for development
        return new ConsoleEmailProvider();
      },
    },
    EmailService,
    EmailEventsListener,
  ],
  exports: [EmailService],
})
export class EmailModule {}

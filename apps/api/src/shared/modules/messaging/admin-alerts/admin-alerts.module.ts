import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { AdminAlertsService } from './admin-alerts.service';

@Module({
  imports: [PrismaModule, AppConfigModule, EmailModule],
  providers: [AdminAlertsService],
  exports: [AdminAlertsService],
})
export class AdminAlertsModule {}

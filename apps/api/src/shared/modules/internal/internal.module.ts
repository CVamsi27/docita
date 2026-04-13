import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalBillingController } from './internal-billing.controller';
import { InternalBillingService } from './internal-billing.service';
import { ClinicManagementService } from './clinic-management.service';
import { InternalAnalyticsService } from './internal-analytics.service';
import { InternalLogService } from './internal-log.service';
import { InternalAiService } from './internal-ai.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicsModule } from '@/domains/clinics/clinics.module';
import { UsersModule } from '@/domains/users/users.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { GatewaysModule } from '@/gateways/gateways.module';
import { FeedbackModule } from '@/domains/feedback/feedback.module';
import { ContactModule } from '@/shared/modules/contact/contact.module';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';

@Module({
  imports: [
    PrismaModule,
    ClinicsModule,
    UsersModule,
    BillingModule,
    FeedbackModule,
    ContactModule,
    SupportWhatsAppModule,
    AuthModule,
    GatewaysModule,
  ],
  controllers: [InternalController, InternalBillingController],
  providers: [
    InternalBillingService,
    PrismaService,
    ClinicManagementService,
    InternalAnalyticsService,
    InternalLogService,
    InternalAiService,
  ],
  exports: [
    InternalBillingService,
    ClinicManagementService,
    InternalAnalyticsService,
    InternalLogService,
    InternalAiService,
  ],
})
export class InternalModule {}

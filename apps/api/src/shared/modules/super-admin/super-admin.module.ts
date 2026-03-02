import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminBillingController } from './super-admin-billing.controller';
import { SuperAdminBillingService } from './super-admin-billing.service';
import { ClinicManagementService } from './clinic-management.service';
import { SuperAdminAnalyticsService } from './super-admin-analytics.service';
import { SuperAdminLogService } from './super-admin-log.service';
import { SuperAdminAiService } from './super-admin-ai.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicsModule } from '@/domains/clinics/clinics.module';
import { UsersModule } from '@/domains/users/users.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { GatewaysModule } from '@/gateways/gateways.module';
import { FeedbackModule } from '@/domains/feedback/feedback.module';

@Module({
  imports: [
    PrismaModule,
    ClinicsModule,
    UsersModule,
    BillingModule,
    FeedbackModule,
    AuthModule,
    GatewaysModule,
  ],
  controllers: [SuperAdminController, SuperAdminBillingController],
  providers: [
    SuperAdminBillingService,
    PrismaService,
    ClinicManagementService,
    SuperAdminAnalyticsService,
    SuperAdminLogService,
    SuperAdminAiService,
  ],
  exports: [
    SuperAdminBillingService,
    ClinicManagementService,
    SuperAdminAnalyticsService,
    SuperAdminLogService,
    SuperAdminAiService,
  ],
})
export class SuperAdminModule {}

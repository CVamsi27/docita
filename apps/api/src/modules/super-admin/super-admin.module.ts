import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminBillingController } from './super-admin-billing.controller';
import { SuperAdminBillingService } from './super-admin-billing.service';
import { ClinicManagementService } from './clinic-management.service';
import { SuperAdminAnalyticsService } from './super-admin-analytics.service';
import { SuperAdminLogService } from './super-admin-log.service';
import { SuperAdminAiService } from './super-admin-ai.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGateway } from '../../gateways/payment.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminController, SuperAdminBillingController],
  providers: [
    SuperAdminBillingService,
    PrismaService,
    PaymentGateway,
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

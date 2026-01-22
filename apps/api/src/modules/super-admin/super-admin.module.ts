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
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';
import { ClinicsModule } from '../clinics/clinics.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, ClinicsModule, UsersModule],
  controllers: [SuperAdminController, SuperAdminBillingController],
  providers: [
    SuperAdminBillingService,
    PrismaService,
    PaymentWebSocketGateway,
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

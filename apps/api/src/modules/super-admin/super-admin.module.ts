import { Module } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminBillingController } from './super-admin-billing.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGateway } from '../../gateways/payment.gateway';

@Module({
  controllers: [SuperAdminController, SuperAdminBillingController],
  providers: [SuperAdminService, PrismaService, PaymentGateway],
})
export class SuperAdminModule {}

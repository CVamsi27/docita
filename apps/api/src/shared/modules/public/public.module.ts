import { Module } from '@nestjs/common';
import { PublicStatsController } from './public-stats.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { PublicStatsService } from './public-stats.service';
import { PublicPatientDocumentsController } from './public-patient-documents.controller';
import { PublicPatientDocumentsService } from './public-patient-documents.service';
import { PrescriptionsModule } from '@/domains/prescriptions/prescriptions.module';
import { BillingModule } from '@/domains/billing/billing.module';

@Module({
  imports: [PrismaModule, PrescriptionsModule, BillingModule],
  controllers: [PublicStatsController, PublicPatientDocumentsController],
  providers: [PublicStatsService, PublicPatientDocumentsService],
})
export class PublicModule {}

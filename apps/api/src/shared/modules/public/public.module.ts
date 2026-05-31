import { Module } from '@nestjs/common';
import { PublicStatsController } from './public-stats.controller';
import { PublicDailyThoughtController } from './public-daily-thought.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { PublicStatsService } from './public-stats.service';
import { PublicDailyThoughtService } from './public-daily-thought.service';
import { PublicPatientDocumentsController } from './public-patient-documents.controller';
import { PublicPatientDocumentsService } from './public-patient-documents.service';
import { PrescriptionsModule } from '@/domains/prescriptions/prescriptions.module';
import { BillingModule } from '@/domains/billing/billing.module';

@Module({
  imports: [PrismaModule, PrescriptionsModule, BillingModule],
  controllers: [
    PublicStatsController,
    PublicDailyThoughtController,
    PublicPatientDocumentsController,
  ],
  providers: [
    PublicStatsService,
    PublicDailyThoughtService,
    PublicPatientDocumentsService,
  ],
})
export class PublicModule {}

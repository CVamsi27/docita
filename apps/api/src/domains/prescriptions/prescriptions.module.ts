import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonServicesModule } from '../../shared/modules/services/common-services.module';
import { PrescriptionsController } from './presentation/controllers/prescription.controller';
import { PrescriptionsService } from './application/services/prescription.service';
import { PrescriptionPdfService } from './application/services/prescription-pdf.service';
import { PrescriptionEventsListener } from './infrastructure/listeners/prescription-events.listener';
import { PrescriptionValidationRulesService } from './core/services/prescription-validation-rules.service';
import { PrismaPrescriptionRepository } from './infrastructure/repositories/prescription.repository';

@Module({
  imports: [PrismaModule, CommonServicesModule],
  controllers: [PrescriptionsController],
  providers: [
    PrescriptionsService,
    PrescriptionPdfService,
    PrescriptionEventsListener,
    PrescriptionValidationRulesService,
    {
      provide: 'IPrescriptionRepository',
      useClass: PrismaPrescriptionRepository,
    },
  ],
  exports: [
    PrescriptionsService,
    PrescriptionPdfService,
    PrescriptionValidationRulesService,
  ],
})
export class PrescriptionsModule {}

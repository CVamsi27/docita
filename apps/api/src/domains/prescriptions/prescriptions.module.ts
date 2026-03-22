import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { PrescriptionsController } from './presentation/controllers/prescription.controller';
import { PrescriptionsService } from './application/services/prescription.service';
import { PrescriptionPdfService } from './application/services/prescription-pdf.service';
import { PrescriptionEventsListener } from './infrastructure/listeners/prescription-events.listener';
import { PrescriptionValidationRulesService } from './core/services/prescription-validation-rules.service';
import { PrismaPrescriptionRepository } from './infrastructure/repositories/prescription.repository';

@Module({
  imports: [
    PrismaModule,
    CommonServicesModule,
    forwardRef(() => BillingModule),
  ],
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

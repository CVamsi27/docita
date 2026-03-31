import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { PrescriptionsController } from './presentation/controllers/prescription.controller';
import { PrescriptionsService } from './application/services/prescription.service';
import { PrescriptionPdfService } from './application/services/prescription-pdf.service';
import { PrescriptionValidationRulesService } from './core/services/prescription-validation-rules.service';
import { PrismaPrescriptionRepository } from './infrastructure/repositories/prescription.repository';

@Module({
  imports: [
    PrismaModule,
    CommonServicesModule,
    forwardRef(() => BillingModule),
    DocumentsModule,
  ],
  controllers: [PrescriptionsController],
  providers: [
    PrescriptionsService,
    PrescriptionPdfService,
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

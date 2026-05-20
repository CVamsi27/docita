import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from '@/shared/modules/auth/guards/feature-flag.guard';
import { PDFGeneratorService } from '@/shared/modules/document-generation/pdf/pdf-generator.service';
import { PdfLayoutService } from '@/shared/modules/document-generation/pdf/pdf-layout.service';
import { PrescriptionPdfRenderer } from '@/shared/modules/document-generation/pdf/prescription-pdf.renderer';
import { InvoicePdfRenderer } from '@/shared/modules/document-generation/pdf/invoice-pdf.renderer';
import { PDF_DOCUMENT_RENDERER } from '@/shared/modules/document-generation/pdf/pdf-document-renderer.interface';
import { BasePdfService } from '@/shared/modules/document-generation/pdf/base-pdf.service';
import { ClinicalInvoicePdfService } from '@/shared/modules/document-generation/pdf/clinical-invoice-pdf.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { ClinicScopedGuard } from '@/shared/modules/auth/decorators/clinic-scoped.decorator';
import { PrismaModule } from '@/prisma/prisma.module';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';
import { EncryptionService } from '@/shared/common/encryption.service';
import { UserRateLimitService } from './user-rate-limit.service';
import { UserRateLimitGuard } from '@/shared/modules/auth/guards/user-rate-limit.guard';
import { DPDPComplianceService as _DPDPComplianceService } from '@/shared/modules/compliance/dpdp-compliance.service';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { UsersModule } from '@/domains/users/users.module';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { SystemClockService } from '@/shared/modules/time/system-clock.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    WhatsAppModule,
    AuditModule,
    ComplianceModule,
    UsersModule,
  ],
  providers: [
    FeatureFlagService,
    FeatureFlagGuard,
    PdfLayoutService,
    PrescriptionPdfRenderer,
    InvoicePdfRenderer,
    ClinicalInvoicePdfService,
    PDFGeneratorService,
    { provide: PDF_DOCUMENT_RENDERER, useExisting: PDFGeneratorService },
    WhatsAppNotificationService,
    ClinicScopedGuard,
    EncryptionService,
    BasePdfService,
    UserRateLimitService,
    UserRateLimitGuard,
    { provide: CLOCK_PORT, useClass: SystemClockService },
  ],
  exports: [
    FeatureFlagService,
    WhatsAppNotificationService,
    ClinicScopedGuard,
    EncryptionService,
    ComplianceModule,
    BasePdfService,
    UserRateLimitService,
    UserRateLimitGuard,
    CLOCK_PORT,
  ],
})
export class CommonServicesModule {}

import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { PDFGeneratorService } from '@/shared/modules/document-generation/pdf/pdf-generator.service';
import { PdfLayoutService } from '@/shared/modules/document-generation/pdf/pdf-layout.service';
import { PdfHeaderService } from '@/shared/modules/document-generation/pdf/pdf-header.service';
import { PdfTablesService } from '@/shared/modules/document-generation/pdf/pdf-tables.service';
import { PdfFooterService } from '@/shared/modules/document-generation/pdf/pdf-footer.service';
import { PrescriptionPdfRenderer } from '@/shared/modules/document-generation/pdf/prescription-pdf.renderer';
import { InvoicePdfRenderer } from '@/shared/modules/document-generation/pdf/invoice-pdf.renderer';
import { PDF_DOCUMENT_RENDERER } from '@/shared/modules/document-generation/pdf/pdf-document-renderer.interface';
import { BasePdfService } from '@/shared/modules/document-generation/pdf/base-pdf.service';
import { ClinicalInvoicePdfService } from '@/shared/modules/document-generation/pdf/clinical-invoice-pdf.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';
import { EncryptionService } from '@/shared/common/encryption.service';
import { CircuitBreakerRegistry } from '@/shared/common/utils/circuit-breaker.registry';
import { UserRateLimitService } from './user-rate-limit.service';
import { UserRateLimitGuard } from '@/shared/modules/auth/guards/user-rate-limit.guard';

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
    PdfLayoutService,
    PdfHeaderService,
    PdfTablesService,
    PdfFooterService,
    PrescriptionPdfRenderer,
    InvoicePdfRenderer,
    ClinicalInvoicePdfService,
    PDFGeneratorService,
    { provide: PDF_DOCUMENT_RENDERER, useExisting: PDFGeneratorService },
    EncryptionService,
    CircuitBreakerRegistry,
    BasePdfService,
    UserRateLimitService,
    UserRateLimitGuard,
    { provide: CLOCK_PORT, useClass: SystemClockService },
  ],
  exports: [
    FeatureFlagService,
    EncryptionService,
    CircuitBreakerRegistry,
    ComplianceModule,
    BasePdfService,
    UserRateLimitService,
    UserRateLimitGuard,
    CLOCK_PORT,
  ],
})
export class CommonServicesModule {}

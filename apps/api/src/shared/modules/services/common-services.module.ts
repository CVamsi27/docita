import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from '../auth/guards/feature-flag.guard';
import { PDFGeneratorService } from '../document-generation/pdf/pdf-generator.service';
import { BasePdfService } from '../document-generation/pdf/base-pdf.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { ClinicScopedGuard } from '../auth/decorators/clinic-scoped.decorator';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WhatsappModule } from '../messaging/whatsapp/whatsapp.module';
import { EncryptionService } from '../../../common/encryption.service';
import { DPDPComplianceService } from '../compliance/dpdp-compliance.service';
import { AuditModule } from '../audit/audit/audit.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { UsersModule } from '../../../domains/users/users.module';

/**
 * Common Services Module
 *
 * Provides shared services across the application:
 * - Feature Flag Service & Guard
 * - PDF Generator Service
 * - WhatsApp Notification Service
 * - Clinic Scoped Guard
 * - Encryption Service (DPDP Compliance)
 * - DPDP Compliance Service
 */
@Global()
@Module({
  imports: [
    PrismaModule,
    WhatsappModule,
    AuditModule,
    ComplianceModule,
    UsersModule,
  ],
  providers: [
    FeatureFlagService,
    FeatureFlagGuard,
    PDFGeneratorService,
    WhatsAppNotificationService,
    ClinicScopedGuard,
    EncryptionService,
    BasePdfService,
  ],
  exports: [
    WhatsAppNotificationService,
    ClinicScopedGuard,
    EncryptionService,
    ComplianceModule,
    BasePdfService,
  ],
})
export class CommonServicesModule {}

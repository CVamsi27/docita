import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from '../guards/feature-flag.guard';
import { PDFGeneratorService } from './pdf-generator.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { ClinicScopedGuard } from '../decorators/clinic-scoped.decorator';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../../modules/whatsapp/whatsapp.module';
import { EncryptionService } from '../encryption.service';
import { DPDPComplianceService } from '../../modules/compliance/dpdp-compliance.service';
import { AuditModule } from '../../modules/audit/audit.module';
import { ComplianceModule } from '../../modules/compliance/compliance.module';

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
  imports: [PrismaModule, WhatsappModule, AuditModule, ComplianceModule],
  providers: [
    FeatureFlagService,
    FeatureFlagGuard,
    PDFGeneratorService,
    WhatsAppNotificationService,
    ClinicScopedGuard,
    EncryptionService,
  ],
  exports: [
    FeatureFlagService,
    FeatureFlagGuard,
    PDFGeneratorService,
    WhatsAppNotificationService,
    ClinicScopedGuard,
    EncryptionService,
    ComplianceModule,
  ],
})
export class CommonServicesModule {}

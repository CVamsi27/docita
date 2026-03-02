import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from '@/shared/modules/auth/guards/feature-flag.guard';
import { PDFGeneratorService } from '@/shared/modules/document-generation/pdf/pdf-generator.service';
import { BasePdfService } from '@/shared/modules/document-generation/pdf/base-pdf.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { ClinicScopedGuard } from '@/shared/modules/auth/decorators/clinic-scoped.decorator';
import { PrismaModule } from '@/prisma/prisma.module';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';
import { EncryptionService } from '@/common/encryption.service';
import { DPDPComplianceService } from '@/shared/modules/compliance/dpdp-compliance.service';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { UsersModule } from '@/domains/users/users.module';

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

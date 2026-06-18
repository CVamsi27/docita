import { Module, forwardRef } from '@nestjs/common';
import { ClinicSettingsController } from './presentation/controllers/clinic-settings.controller';
import { ClinicSettingsService } from './application/services/clinic-settings.service';
import { ClinicSettingsQueryService } from './application/services/clinic-settings-query.service';
import { ClinicSettingsCommandService } from './application/services/clinic-settings-command.service';
import { ClinicAbdmDashboardService } from './application/services/clinic-abdm-dashboard.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { ClinicsModule } from './clinics.module';
import { CLINIC_PERSISTENCE_PORT } from './application/ports/clinic-persistence.port';
import { ClinicsStaffModule } from './clinics-staff.module';
import { ClinicAbdmController } from './presentation/controllers/clinic-abdm.controller';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    forwardRef(() => ClinicsModule),
    ClinicsStaffModule,
  ],
  controllers: [ClinicSettingsController, ClinicAbdmController],
  providers: [
    { provide: CLINIC_PERSISTENCE_PORT, useExisting: PrismaService },
    ClinicSettingsService,
    ClinicSettingsQueryService,
    ClinicSettingsCommandService,
    ClinicAbdmDashboardService,
  ],
  exports: [
    ClinicSettingsService,
    ClinicSettingsQueryService,
    ClinicSettingsCommandService,
  ],
})
export class ClinicsSettingsModule {}

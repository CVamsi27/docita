import { Module } from '@nestjs/common';
import {
  ClinicsController,
  ClinicSettingsController,
} from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { StaffManagementService } from './staff-management.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClinicFactory } from './factories/clinic.factory';
import { SettingsFactory } from './factories/settings.factory';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicsController, ClinicSettingsController],
  providers: [
    ClinicDataService,
    ClinicSettingsService,
    StaffManagementService,
    ClinicsService,
    ClinicFactory,
    SettingsFactory,
  ],
  exports: [ClinicsService, ClinicFactory, SettingsFactory],
})
export class ClinicsModule {}

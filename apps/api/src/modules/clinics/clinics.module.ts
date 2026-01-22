import { Module } from '@nestjs/common';
import {
  ClinicsController,
  ClinicSettingsController,
} from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClinicFactory } from './factories/clinic.factory';
import { SettingsFactory } from './factories/settings.factory';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicsController, ClinicSettingsController],
  providers: [ClinicsService, ClinicFactory, SettingsFactory],
  exports: [ClinicsService, ClinicFactory, SettingsFactory],
})
export class ClinicsModule {}

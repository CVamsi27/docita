import { Module } from '@nestjs/common';
import {
  ClinicsController,
  ClinicSettingsController,
} from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicsController, ClinicSettingsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}

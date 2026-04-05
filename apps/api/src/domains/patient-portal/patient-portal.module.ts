import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { WhatsappModule } from '@/shared/modules/messaging/whatsapp/whatsapp.module';
import { PatientsModule } from '@/domains/patients/patients.module';

import { PatientPortalAuthService } from './application/services/patient-portal-auth.service';
import { PatientPortalContextService } from './application/services/patient-portal-context.service';
import { PatientPortalMetricsService } from './application/services/patient-portal-metrics.service';
import { PatientPortalService } from './application/services/patient-portal.service';

import { PatientPortalAuthController } from './presentation/controllers/patient-portal-auth.controller';
import { PatientPortalController } from './presentation/controllers/patient-portal.controller';
import { PatientPortalMetricsController } from './presentation/controllers/patient-portal-metrics.controller';

import { PrismaPatientPortalRepository } from './infrastructure/repositories/prisma-patient-portal.repository';
import { PATIENT_PORTAL_REPOSITORY_TOKEN } from './core/repositories/patient-portal.repository.interface';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AppConfigModule,
    WhatsappModule,
    PatientsModule,
  ],
  controllers: [
    PatientPortalAuthController,
    PatientPortalController,
    PatientPortalMetricsController,
  ],
  providers: [
    PatientPortalAuthService,
    PatientPortalContextService,
    PatientPortalMetricsService,
    PatientPortalService,
    {
      provide: PATIENT_PORTAL_REPOSITORY_TOKEN,
      useClass: PrismaPatientPortalRepository,
    },
  ],
})
export class PatientPortalModule {}

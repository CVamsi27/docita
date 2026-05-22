import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { PatientsModule } from '@/domains/patients/patients.module';
import { AppointmentsModule } from '@/domains/appointments/appointments.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';

import { PatientPortalAuthService } from './application/services/patient-portal-auth.service';
import { PatientPortalAuthCommandService } from './application/services/patient-portal-auth-command.service';
import { PatientPortalContextService } from './application/services/patient-portal-context.service';
import { PatientPortalMetricsService } from './application/services/patient-portal-metrics.service';
import { PatientPortalService } from './application/services/patient-portal.service';
import { PatientPortalCommandService } from './application/services/patient-portal-command.service';
import { PatientPortalQueryService } from './application/services/patient-portal-query.service';

import { PatientPortalAuthController } from './presentation/controllers/patient-portal-auth.controller';
import { PatientPortalController } from './presentation/controllers/patient-portal.controller';
import { PatientPortalRecordsController } from './presentation/controllers/patient-portal-records.controller';
import { PatientPortalClinicalController } from './presentation/controllers/patient-portal-clinical.controller';
import { PatientPortalMetricsController } from './presentation/controllers/patient-portal-metrics.controller';

import { PrismaPatientPortalRepository } from './infrastructure/repositories/prisma-patient-portal.repository';
import { PrismaPortalProfileRepository } from './infrastructure/repositories/prisma-portal-profile.repository';
import { PrismaPortalAuthRepository } from './infrastructure/repositories/prisma-portal-auth.repository';
import { PrismaPortalAppointmentsRepository } from './infrastructure/repositories/prisma-portal-appointments.repository';
import { PrismaPortalDocumentsRepository } from './infrastructure/repositories/prisma-portal-documents.repository';
import {
  PATIENT_PORTAL_REPOSITORY_TOKEN,
  PORTAL_APPOINTMENTS_REPOSITORY_TOKEN,
  PORTAL_AUTH_REPOSITORY_TOKEN,
  PORTAL_DOCUMENTS_REPOSITORY_TOKEN,
  PORTAL_PROFILE_REPOSITORY_TOKEN,
} from './core/repositories/patient-portal.repository.interface';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AppConfigModule,
    WhatsappModule,
    PatientsModule,
    AppointmentsModule,
    AuditModule,
  ],
  controllers: [
    PatientPortalAuthController,
    PatientPortalController,
    PatientPortalRecordsController,
    PatientPortalClinicalController,
    PatientPortalMetricsController,
  ],
  providers: [
    PatientPortalAuthCommandService,
    PatientPortalAuthService,
    PatientPortalContextService,
    PatientPortalMetricsService,
    PatientPortalQueryService,
    PatientPortalCommandService,
    PatientPortalService,
    PrismaPortalProfileRepository,
    PrismaPortalAuthRepository,
    PrismaPortalAppointmentsRepository,
    PrismaPortalDocumentsRepository,
    PrismaPatientPortalRepository,
    {
      provide: PATIENT_PORTAL_REPOSITORY_TOKEN,
      useExisting: PrismaPatientPortalRepository,
    },
    {
      provide: PORTAL_PROFILE_REPOSITORY_TOKEN,
      useExisting: PrismaPortalProfileRepository,
    },
    {
      provide: PORTAL_AUTH_REPOSITORY_TOKEN,
      useExisting: PrismaPortalAuthRepository,
    },
    {
      provide: PORTAL_APPOINTMENTS_REPOSITORY_TOKEN,
      useExisting: PrismaPortalAppointmentsRepository,
    },
    {
      provide: PORTAL_DOCUMENTS_REPOSITORY_TOKEN,
      useExisting: PrismaPortalDocumentsRepository,
    },
  ],
})
export class PatientPortalModule {}

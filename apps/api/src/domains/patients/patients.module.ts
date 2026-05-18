import { Module } from '@nestjs/common';
import { PatientService } from './application/services/patient.service';
import { PatientsController } from './presentation/controllers/patients.controller';
import { MedicalHistoryController } from './presentation/controllers/medical-history.controller';
import { PatientMetricsController } from './presentation/controllers/patient-metrics.controller';
import { MedicationDoseController } from './presentation/controllers/medication-dose.controller';
import { PatientTimelineController } from './presentation/controllers/patient-timeline.controller';
import { MedicalHistoryService } from './application/services/medical-history.service';
import { MedicalHistoryConditionsService } from './application/services/medical-history-conditions.service';
import { PatientMetricsService } from './application/services/patientMetrics.service';
import { MedicationDoseService } from './application/services/medication-dose.service';
import { PatientTimelineService } from './application/services/patient-timeline.service';
import { PatientTagsService } from './application/services/patient-tags.service';
import { PrismaPatientRepository } from './infrastructure/persistence/prisma-patient.repository';
import { PrismaMedicationDoseRepository } from './infrastructure/persistence/prisma-medication-dose.repository';
import { PrismaPatientTimelineRepository } from './infrastructure/persistence/prisma-patient-timeline.repository';
import { PrismaPatientMetricsRepository } from './infrastructure/persistence/prisma-patient-metrics.repository';
import { PrismaPatientTagsRepository } from './infrastructure/persistence/prisma-patient-tags.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { MedicalHistoryFactory } from './core/factories/medical-history.factory';
import { VitalsFactory } from './core/factories/vitals.factory';
import { AiModule } from '@/shared/modules/ai-core/ai.module';
import { MEDICATION_DOSE_REPOSITORY_TOKEN } from './core/repositories/medication-dose.repository.interface';
import { PATIENT_TIMELINE_REPOSITORY_TOKEN } from './core/repositories/patient-timeline.repository.interface';
import { PATIENT_METRICS_REPOSITORY_TOKEN } from './core/repositories/patient-metrics.repository.interface';
import { PATIENT_TAGS_REPOSITORY_TOKEN } from './core/repositories/patient-tags.repository.interface';
import { PatientTagsController } from './presentation/controllers/patient-tags.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, AiModule, ComplianceModule],
  controllers: [
    PatientsController,
    PatientTagsController,
    MedicalHistoryController,
    PatientMetricsController,
    MedicationDoseController,
    PatientTimelineController,
  ],
  providers: [
    PatientService,
    PatientTagsService,
    MedicalHistoryConditionsService,
    MedicalHistoryService,
    PatientMetricsService,
    MedicationDoseService,
    PatientTimelineService,
    PrismaPatientRepository,
    {
      provide: 'IPatientRepository',
      useClass: PrismaPatientRepository,
    },
    {
      provide: MEDICATION_DOSE_REPOSITORY_TOKEN,
      useClass: PrismaMedicationDoseRepository,
    },
    {
      provide: PATIENT_TIMELINE_REPOSITORY_TOKEN,
      useClass: PrismaPatientTimelineRepository,
    },
    {
      provide: PATIENT_METRICS_REPOSITORY_TOKEN,
      useClass: PrismaPatientMetricsRepository,
    },
    {
      provide: PATIENT_TAGS_REPOSITORY_TOKEN,
      useClass: PrismaPatientTagsRepository,
    },
    MedicalHistoryFactory,
    VitalsFactory,
  ],
  exports: [
    PatientService,
    PatientMetricsService,
    MedicationDoseService,
    PatientTimelineService,
    'IPatientRepository',
    VitalsFactory,
  ],
})
export class PatientsModule {}

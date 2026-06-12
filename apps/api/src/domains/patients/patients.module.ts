import { PrismaService } from '@/prisma/prisma.service';
import { PATIENT_PERSISTENCE_PORT } from './application/ports/patient-persistence.port';
import { Module } from '@nestjs/common';
import { PatientService } from './application/services/patient.service';
import { PatientCommandService } from './application/services/patient-command.service';
import { PatientQueryService } from './application/services/patient-query.service';
import { PatientsController } from './presentation/controllers/patients.controller';
import { MedicalHistoryConditionsController } from './presentation/controllers/medical-history-conditions.controller';
import { MedicalHistoryExtendedController } from './presentation/controllers/medical-history-extended.controller';
import { PatientMetricsController } from './presentation/controllers/patient-metrics.controller';
import { MedicationDoseController } from './presentation/controllers/medication-dose.controller';
import { PatientTimelineController } from './presentation/controllers/patient-timeline.controller';
import { MedicalHistoryService } from './application/services/medical-history.service';
import { MedicalHistoryConditionsService } from './application/services/medical-history-conditions.service';
import { PatientMetricsService } from './application/services/patientMetrics.service';
import { MedicationDoseService } from './application/services/medication-dose.service';
import { MedicationDoseCommandService } from './application/services/medication-dose-command.service';
import { MedicationDoseQueryService } from './application/services/medication-dose-query.service';
import { PatientTimelineService } from './application/services/patient-timeline.service';
import { PatientTimelineQueryService } from './application/services/patient-timeline-query.service';
import { PatientTagsService } from './application/services/patient-tags.service';
import { PrismaPatientRepository } from './infrastructure/persistence/prisma-patient.repository';
import { PrismaMedicationDoseRepository } from './infrastructure/persistence/prisma-medication-dose.repository';
import { PrismaPatientTimelineSnapshotRepository } from './infrastructure/persistence/timeline/prisma-patient-timeline-snapshot.repository';
import { PATIENT_TIMELINE_SOURCE_CLASSES } from './infrastructure/persistence/timeline/prisma-patient-timeline-sources';
import { PatientTimelineSourceRegistry } from './application/services/patient-timeline-source.registry';
import { PrismaPatientMetricsRepository } from './infrastructure/persistence/prisma-patient-metrics.repository';
import { PrismaPatientTagsRepository } from './infrastructure/persistence/prisma-patient-tags.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { AbdmModule } from '@/domains/abdm/abdm.module';
import { MedicalHistoryFactory } from './core/factories/medical-history.factory';
import { VitalsFactory } from './core/factories/vitals.factory';
import { AiModule } from '@/shared/modules/ai-core/ai.module';
import { MEDICATION_DOSE_REPOSITORY_TOKEN } from './core/repositories/medication-dose.repository.interface';
import {
  PATIENT_TIMELINE_REPOSITORY_TOKEN,
  PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN,
} from './core/repositories/patient-timeline.repository.interface';
import { PATIENT_METRICS_REPOSITORY_TOKEN } from './core/repositories/patient-metrics.repository.interface';
import { PATIENT_TAGS_REPOSITORY_TOKEN } from './core/repositories/patient-tags.repository.interface';
import { PatientTagsController } from './presentation/controllers/patient-tags.controller';
import { PatientAbdmController } from './presentation/controllers/patient-abdm.controller';
import { AbhaVerificationCommandService } from './application/services/abha-verification-command.service';
import { AbhaVerificationService } from './application/services/abha-verification.service';
import { AbdmHttpGateway } from './infrastructure/external/abdm-http.gateway';
import { PrismaAbhaVerificationStore } from './infrastructure/persistence/prisma-abha-verification.store';
import {
  ABDM_GATEWAY,
  ABHA_VERIFICATION_STORE,
} from './core/ports/abha-verification.port';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    AiModule,
    ComplianceModule,
    AbdmModule,
  ],
  controllers: [
    PatientsController,
    PatientTagsController,
    MedicalHistoryConditionsController,
    MedicalHistoryExtendedController,
    PatientMetricsController,
    MedicationDoseController,
    PatientTimelineController,
    PatientAbdmController,
  ],
  providers: [
    { provide: PATIENT_PERSISTENCE_PORT, useExisting: PrismaService },
    AbhaVerificationCommandService,
    AbhaVerificationService,
    { provide: ABDM_GATEWAY, useClass: AbdmHttpGateway },
    { provide: ABHA_VERIFICATION_STORE, useClass: PrismaAbhaVerificationStore },
    PatientQueryService,
    PatientCommandService,
    PatientService,
    PatientTagsService,
    MedicalHistoryConditionsService,
    MedicalHistoryService,
    PatientMetricsService,
    MedicationDoseCommandService,
    MedicationDoseQueryService,
    MedicationDoseService,
    PatientTimelineQueryService,
    PatientTimelineService,
    PatientTimelineSourceRegistry,
    ...PATIENT_TIMELINE_SOURCE_CLASSES,
    PrismaPatientTimelineSnapshotRepository,
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
      provide: PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN,
      useExisting: PrismaPatientTimelineSnapshotRepository,
    },
    {
      provide: PATIENT_TIMELINE_REPOSITORY_TOKEN,
      useExisting: PrismaPatientTimelineSnapshotRepository,
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
    PatientQueryService,
    PatientCommandService,
    PatientService,
    PatientMetricsService,
    MedicationDoseCommandService,
    MedicationDoseQueryService,
    MedicationDoseService,
    PatientTimelineQueryService,
    PatientTimelineService,
    'IPatientRepository',
    VitalsFactory,
  ],
})
export class PatientsModule {}

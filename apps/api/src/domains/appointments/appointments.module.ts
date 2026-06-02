import { PrismaService } from '@/prisma/prisma.service';
import { APPOINTMENT_PERSISTENCE_PORT } from './application/ports/appointment-persistence.port';
import { Module } from '@nestjs/common';
import { AppointmentService } from './application/services/appointment.service';
import { AppointmentQueryService } from './application/services/appointment-query.service';
import { AppointmentCommandService } from './application/services/appointment-command.service';
import { AppointmentMetricsService } from './application/services/appointment-metrics.service';
import { AppointmentMetricDefinitionService } from './application/services/appointment-metric-definition.service';
import { AppointmentDiagnosisService } from './application/services/appointment-diagnosis.service';
import { AppointmentsScheduleController } from './presentation/controllers/appointments-schedule.controller';
import { AppointmentsConsultationController } from './presentation/controllers/appointments-consultation.controller';
import { AppointmentsClinicalController } from './presentation/controllers/appointments-clinical.controller';
import { OpdSlipController } from './presentation/controllers/opd-slip.controller';
import { OpdSlipService } from './application/services/opd-slip.service';
import { OpdSlipPdfService } from './application/services/opd-slip-pdf.service';
import { AppointmentRequestController } from './presentation/controllers/appointment-request.controller';
import {
  APPOINTMENT_READ_REPOSITORY_TOKEN,
  APPOINTMENT_REPOSITORY_TOKEN,
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
} from './core/repositories/appointment.repository.interface';
import { PrismaAppointmentReadRepository } from './infrastructure/persistence/prisma-appointment-read.repository';
import { PrismaAppointmentWriteRepository } from './infrastructure/persistence/prisma-appointment-write.repository';
import { PrismaAppointmentRepository } from './infrastructure/persistence/prisma-appointment.repository';
import { AppointmentSchedulingRulesService } from './core/domain-services/appointment-scheduling-rules.service';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case';
import { CancelAppointmentUseCase } from './application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from './application/use-cases/reschedule-appointment.use-case';
import { StartConsultationUseCase } from './application/use-cases/start-consultation.use-case';
import { UpdateAppointmentDetailsUseCase } from './application/use-cases/update-appointment-details.use-case';
import { SyncAppointmentDiagnosesUseCase } from './application/use-cases/sync-appointment-diagnoses.use-case';
import { RecordAppointmentVitalsUseCase } from './application/use-cases/record-appointment-vitals.use-case';
import { AppointmentRequestService } from './application/services/appointment-request.service';
import { AppointmentRequestCommandService } from './application/services/appointment-request-command.service';
import { AppointmentRequestQueryService } from './application/services/appointment-request-query.service';
import { FollowUpService } from './application/services/follow-up.service';
import { FollowUpCommandService } from './application/services/follow-up-command.service';
import { FollowUpQueryService } from './application/services/follow-up-query.service';
import { FollowUpController } from './presentation/controllers/follow-up.controller';
import { QueueService } from './application/services/queue.service';
import { QueueCommandService } from './application/services/queue-command.service';
import { QueueQueryService } from './application/services/queue-query.service';
import { QueueController } from './presentation/controllers/queue.controller';
import { DoctorDelayService } from './application/services/doctor-delay.service';
import { DoctorDelayController } from './presentation/controllers/doctor-delay.controller';
import { DOCTOR_DELAY_REPOSITORY_TOKEN } from './application/ports/doctor-delay.repository.port';
import { PrismaDoctorDelayRepository } from './infrastructure/repositories/prisma-doctor-delay.repository';
import { PatientsModule } from '@/domains/patients';
import { PrismaQueueRepository } from './infrastructure/repositories/prisma-queue.repository';
import { PrismaFollowUpRepository } from './infrastructure/repositories/prisma-follow-up.repository';
import { PrismaAppointmentRequestRepository } from './infrastructure/repositories/prisma-appointment-request.repository';
import { QUEUE_REPOSITORY_TOKEN } from './core/repositories/queue.repository.interface';
import { FOLLOW_UP_REPOSITORY_TOKEN } from './core/repositories/follow-up.repository.interface';
import { APPOINTMENT_REQUEST_REPOSITORY_TOKEN } from './core/repositories/appointment-request.repository.interface';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';

@Module({
  imports: [PatientsModule, WhatsappModule, AuditModule],
  controllers: [
    AppointmentsScheduleController,
    AppointmentsConsultationController,
    AppointmentsClinicalController,
    AppointmentRequestController,
    OpdSlipController,
    FollowUpController,
    QueueController,
    DoctorDelayController,
  ],
  providers: [
    { provide: APPOINTMENT_PERSISTENCE_PORT, useExisting: PrismaService },
    AppointmentService,
    AppointmentQueryService,
    AppointmentCommandService,
    AppointmentMetricsService,
    AppointmentMetricDefinitionService,
    AppointmentDiagnosisService,
    OpdSlipService,
    OpdSlipPdfService,
    AppointmentRequestCommandService,
    AppointmentRequestQueryService,
    AppointmentRequestService,
    DoctorDelayService,
    {
      provide: DOCTOR_DELAY_REPOSITORY_TOKEN,
      useClass: PrismaDoctorDelayRepository,
    },
    CreateAppointmentUseCase,
    CancelAppointmentUseCase,
    RescheduleAppointmentUseCase,
    StartConsultationUseCase,
    UpdateAppointmentDetailsUseCase,
    SyncAppointmentDiagnosesUseCase,
    RecordAppointmentVitalsUseCase,
    PrismaAppointmentReadRepository,
    PrismaAppointmentWriteRepository,
    PrismaAppointmentRepository,
    AppointmentSchedulingRulesService,
    FollowUpQueryService,
    FollowUpCommandService,
    FollowUpService,
    QueueCommandService,
    QueueQueryService,
    QueueService,
    {
      provide: APPOINTMENT_REPOSITORY_TOKEN,
      useExisting: PrismaAppointmentRepository,
    },
    {
      provide: 'IAppointmentRepository',
      useExisting: PrismaAppointmentRepository,
    },
    {
      provide: APPOINTMENT_READ_REPOSITORY_TOKEN,
      useExisting: PrismaAppointmentReadRepository,
    },
    {
      provide: APPOINTMENT_WRITE_REPOSITORY_TOKEN,
      useExisting: PrismaAppointmentWriteRepository,
    },
    { provide: QUEUE_REPOSITORY_TOKEN, useClass: PrismaQueueRepository },
    { provide: FOLLOW_UP_REPOSITORY_TOKEN, useClass: PrismaFollowUpRepository },
    {
      provide: APPOINTMENT_REQUEST_REPOSITORY_TOKEN,
      useClass: PrismaAppointmentRequestRepository,
    },
  ],
  exports: [
    AppointmentService,
    APPOINTMENT_REPOSITORY_TOKEN,
    'IAppointmentRepository',
    AppointmentSchedulingRulesService,
    AppointmentRequestCommandService,
    AppointmentRequestQueryService,
    AppointmentRequestService,
    FollowUpService,
    QueueCommandService,
    QueueQueryService,
    QueueService,
  ],
})
export class AppointmentsModule {}

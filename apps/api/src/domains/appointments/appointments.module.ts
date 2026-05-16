import { Module } from '@nestjs/common';
import { AppointmentService } from './application/services/appointment.service';
import { AppointmentQueryService } from './application/services/appointment-query.service';
import { AppointmentCommandService } from './application/services/appointment-command.service';
import { AppointmentMetricsService } from './application/services/appointment-metrics.service';
import { AppointmentDiagnosisService } from './application/services/appointment-diagnosis.service';
import { AppointmentsController } from './presentation/controllers/appointments.controller';
import { AppointmentRequestController } from './presentation/controllers/appointment-request.controller';
import { PrismaAppointmentRepository } from './infrastructure/persistence/prisma-appointment.repository';
import { AppointmentSchedulingRulesService } from './core/domain-services/appointment-scheduling-rules.service';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case';
import { AppointmentRequestService } from './application/services/appointment-request.service';
import { FollowUpService } from './application/services/follow-up.service';
import { FollowUpController } from './presentation/controllers/follow-up.controller';
import { QueueService } from './application/services/queue.service';
import { QueueController } from './presentation/controllers/queue.controller';
import { PatientsModule } from '@/domains/patients';
import { PrismaQueueRepository } from './infrastructure/repositories/prisma-queue.repository';
import { PrismaFollowUpRepository } from './infrastructure/repositories/prisma-follow-up.repository';
import { PrismaAppointmentRequestRepository } from './infrastructure/repositories/prisma-appointment-request.repository';
import { QUEUE_REPOSITORY_TOKEN } from './core/repositories/queue.repository.interface';
import { FOLLOW_UP_REPOSITORY_TOKEN } from './core/repositories/follow-up.repository.interface';
import { APPOINTMENT_REQUEST_REPOSITORY_TOKEN } from './core/repositories/appointment-request.repository.interface';
import { WhatsappModule } from '@/shared/modules/messaging/whatsapp/whatsapp.module';

@Module({
  imports: [PatientsModule, WhatsappModule],
  controllers: [
    AppointmentsController,
    AppointmentRequestController,
    FollowUpController,
    QueueController,
  ],
  providers: [
    AppointmentService,
    AppointmentQueryService,
    AppointmentCommandService,
    AppointmentMetricsService,
    AppointmentDiagnosisService,
    AppointmentRequestService,
    CreateAppointmentUseCase,
    PrismaAppointmentRepository,
    AppointmentSchedulingRulesService,
    FollowUpService,
    QueueService,
    {
      provide: 'IAppointmentRepository',
      useClass: PrismaAppointmentRepository,
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
    'IAppointmentRepository',
    AppointmentSchedulingRulesService,
    AppointmentRequestService,
    FollowUpService,
    QueueService,
  ],
})
export class AppointmentsModule {}

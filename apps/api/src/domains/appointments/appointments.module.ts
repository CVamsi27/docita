import { Module } from '@nestjs/common';
import { AppointmentService } from './application/services/appointment.service';
import { AppointmentsController } from './presentation/controllers/appointments.controller';
import { PrismaAppointmentRepository } from './infrastructure/persistence/prisma-appointment.repository';
import { AppointmentSchedulingRulesService } from './core/domain-services/appointment-scheduling-rules.service';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case';
import { FollowUpService } from './application/services/follow-up.service';
import { FollowUpController } from './presentation/controllers/follow-up.controller';
import { QueueService } from './application/services/queue.service';
import { QueueController } from './presentation/controllers/queue.controller';
import { PatientsModule } from '@/domains/patients';
import { PrismaQueueRepository } from './infrastructure/repositories/prisma-queue.repository';
import { PrismaFollowUpRepository } from './infrastructure/repositories/prisma-follow-up.repository';
import { QUEUE_REPOSITORY_TOKEN } from './core/repositories/queue.repository.interface';
import { FOLLOW_UP_REPOSITORY_TOKEN } from './core/repositories/follow-up.repository.interface';

@Module({
  imports: [PatientsModule],
  controllers: [AppointmentsController, FollowUpController, QueueController],
  providers: [
    AppointmentService,
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
  ],
  exports: [
    AppointmentService,
    'IAppointmentRepository',
    AppointmentSchedulingRulesService,
    FollowUpService,
    QueueService,
  ],
})
export class AppointmentsModule {}

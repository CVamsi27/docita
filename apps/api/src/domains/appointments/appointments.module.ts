import { Module } from '@nestjs/common';
import { AppointmentService } from './application/services/appointment.service';
import { AppointmentsController } from './presentation/controllers/appointments.controller';
import { PrismaAppointmentRepository } from './infrastructure/persistence/prisma-appointment.repository';
import { AppointmentSchedulingRulesService } from './core/domain-services/appointment-scheduling-rules.service';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case';
import { PatientsModule } from '../patients';

@Module({
  imports: [PatientsModule],
  controllers: [AppointmentsController],
  providers: [
    AppointmentService,
    CreateAppointmentUseCase,
    PrismaAppointmentRepository,
    AppointmentSchedulingRulesService,
    {
      provide: 'IAppointmentRepository',
      useClass: PrismaAppointmentRepository,
    },
  ],
  exports: [
    AppointmentService,
    'IAppointmentRepository',
    AppointmentSchedulingRulesService,
  ],
})
export class AppointmentsModule {}

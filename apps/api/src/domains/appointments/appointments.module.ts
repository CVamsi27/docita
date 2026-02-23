import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PrismaAppointmentRepository } from './repositories/prisma-appointment.repository';
import { AppointmentSchedulingRulesService } from './domain-services/appointment-scheduling-rules.service';
import { PatientsModule } from '../patients';

@Module({
  imports: [PatientsModule],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    PrismaAppointmentRepository,
    AppointmentSchedulingRulesService,
    {
      provide: 'IAppointmentRepository',
      useClass: PrismaAppointmentRepository,
    },
  ],
  exports: [
    AppointmentsService,
    'IAppointmentRepository',
    AppointmentSchedulingRulesService,
  ],
})
export class AppointmentsModule {}

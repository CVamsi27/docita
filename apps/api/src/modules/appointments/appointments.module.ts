import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PrismaAppointmentRepository } from './repositories/prisma-appointment.repository';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    PrismaAppointmentRepository,
    {
      provide: 'IAppointmentRepository',
      useClass: PrismaAppointmentRepository,
    },
  ],
  exports: [AppointmentsService, 'IAppointmentRepository'],
})
export class AppointmentsModule {}

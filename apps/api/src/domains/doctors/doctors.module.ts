import { Module } from '@nestjs/common';
import { DoctorsController } from './presentation/controllers/doctors.controller';
import { DoctorsService } from './application/services/doctors.service';
import { DoctorAvailabilityController } from './presentation/controllers/doctor-availability.controller';
import { DoctorAvailabilityService } from './application/services/doctor-availability.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorsController, DoctorAvailabilityController],
  providers: [DoctorsService, DoctorAvailabilityService],
  exports: [DoctorsService, DoctorAvailabilityService],
})
export class DoctorsModule {}

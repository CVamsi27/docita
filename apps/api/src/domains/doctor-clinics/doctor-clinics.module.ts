import { Module } from '@nestjs/common';
import { DoctorClinicsController } from './presentation/controllers/doctor-clinics.controller';
import { DoctorClinicsService } from './application/services/doctor-clinics.service';
import { DOCTOR_CLINICS_REPOSITORY_TOKEN } from './application/ports/doctor-clinics.repository.port';
import { PrismaDoctorClinicsRepository } from './infrastructure/repositories/prisma-doctor-clinics.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorClinicsController],
  providers: [
    DoctorClinicsService,
    {
      provide: DOCTOR_CLINICS_REPOSITORY_TOKEN,
      useClass: PrismaDoctorClinicsRepository,
    },
  ],
  exports: [DoctorClinicsService],
})
export class DoctorClinicsModule {}

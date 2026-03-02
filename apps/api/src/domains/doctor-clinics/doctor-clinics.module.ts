import { Module } from '@nestjs/common';
import { DoctorClinicsController } from './presentation/controllers/doctor-clinics.controller';
import { DoctorClinicsService } from './application/services/doctor-clinics.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorClinicsController],
  providers: [DoctorClinicsService],
  exports: [DoctorClinicsService],
})
export class DoctorClinicsModule {}

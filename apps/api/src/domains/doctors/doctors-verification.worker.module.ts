import { Module } from '@nestjs/common';
import { DoctorVerificationService } from './application/services/doctor-verification.service';
import { DOCTOR_VERIFICATION_REPOSITORY_TOKEN } from './core/repositories/doctor-verification.repository.interface';
import { PrismaDoctorVerificationRepository } from './infrastructure/repositories/prisma-doctor-verification.repository';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { DoctorReverificationCron } from './doctor-reverification.cron';

/**
 * NMC doctor re-verification cron for the worker only (avoids importing full DoctorsModule + DocumentsModule).
 */
@Module({
  imports: [PrismaWorkerModule],
  providers: [
    DoctorVerificationService,
    DoctorReverificationCron,
    {
      provide: DOCTOR_VERIFICATION_REPOSITORY_TOKEN,
      useClass: PrismaDoctorVerificationRepository,
    },
  ],
})
export class DoctorsVerificationWorkerModule {}

import { Module } from '@nestjs/common';
import { DoctorsController } from './presentation/controllers/doctors.controller';
import { InternalDoctorsVerificationController } from './presentation/controllers/internal-doctors-verification.controller';
import { DoctorsService } from './application/services/doctors.service';
import { DoctorsQueryService } from './application/services/doctors-query.service';
import { DoctorsCommandService } from './application/services/doctors-command.service';
import { DoctorProfileService } from './application/services/doctor-profile.service';
import { DoctorAvailabilityController } from './presentation/controllers/doctor-availability.controller';
import { DoctorAvailabilityService } from './application/services/doctor-availability.service';
import { AvailabilityScheduleService } from './application/services/availability-schedule.service';
import { SlotGenerationService } from './application/services/slot-generation.service';
import { DoctorVerificationService } from './application/services/doctor-verification.service';
import { SignatureUploadService } from './application/services/signature-upload.service';
import { SignatureUploadController } from './presentation/controllers/signature-upload.controller';
import { ClinicSignatureController } from '@/domains/clinics/presentation/controllers/clinic-signature.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { DOCTOR_SCHEDULE_REPOSITORY_TOKEN } from './core/repositories/doctor-schedule.repository.interface';
import { PrismaDoctorScheduleRepository } from './infrastructure/repositories/prisma-doctor-schedule.repository';
import { APPOINTMENT_REPOSITORY_TOKEN } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { PrismaAppointmentRepository } from '@/domains/appointments/infrastructure/persistence/prisma-appointment.repository';
import { DOCTOR_VERIFICATION_REPOSITORY_TOKEN } from './core/repositories/doctor-verification.repository.interface';
import { PrismaDoctorVerificationRepository } from './infrastructure/repositories/prisma-doctor-verification.repository';
import { SIGNATURE_UPLOAD_REPOSITORY_TOKEN } from './core/repositories/signature-upload.repository.interface';
import { PrismaSignatureUploadRepository } from './infrastructure/repositories/prisma-signature-upload.repository';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [
    DoctorsController,
    InternalDoctorsVerificationController,
    DoctorAvailabilityController,
    SignatureUploadController,
    ClinicSignatureController,
  ],
  providers: [
    DoctorsService,
    DoctorsQueryService,
    DoctorsCommandService,
    DoctorProfileService,
    DoctorAvailabilityService,
    AvailabilityScheduleService,
    SlotGenerationService,
    DoctorVerificationService,
    SignatureUploadService,
    {
      provide: DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
      useClass: PrismaDoctorScheduleRepository,
    },
    {
      provide: APPOINTMENT_REPOSITORY_TOKEN,
      useClass: PrismaAppointmentRepository,
    },
    {
      provide: DOCTOR_VERIFICATION_REPOSITORY_TOKEN,
      useClass: PrismaDoctorVerificationRepository,
    },
    {
      provide: SIGNATURE_UPLOAD_REPOSITORY_TOKEN,
      useClass: PrismaSignatureUploadRepository,
    },
  ],
  exports: [
    DoctorsService,
    DoctorAvailabilityService,
    DoctorVerificationService,
    SlotGenerationService,
  ],
})
export class DoctorsModule {}

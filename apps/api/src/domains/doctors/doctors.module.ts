import { PrismaService } from '@/prisma/prisma.service';
import { DOCTOR_PERSISTENCE_PORT } from './application/ports/doctor-persistence.port';
import { Module } from '@nestjs/common';
import { DoctorsOptionsController } from './presentation/controllers/doctors-options.controller';
import { DoctorsProfileController } from './presentation/controllers/doctors-profile.controller';
import { DoctorsComplianceController } from './presentation/controllers/doctors-compliance.controller';
import { DoctorsCredentialsController } from './presentation/controllers/doctors-credentials.controller';
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
import { DoctorAdminVerificationCommandService } from './application/services/doctor-admin-verification-command.service';
import { SignatureUploadController } from './presentation/controllers/signature-upload.controller';
import { ClinicSignatureController } from '@/domains/clinics/presentation/controllers/clinic-signature.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import {
  DOCTOR_SCHEDULE_CORE_REPOSITORY_TOKEN,
  DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
  DOCTOR_TIME_OFF_REPOSITORY_TOKEN,
} from './core/repositories/doctor-schedule.repository.interface';
import { PrismaDoctorScheduleCoreRepository } from './infrastructure/repositories/prisma-doctor-schedule-core.repository';
import { PrismaDoctorScheduleRepository } from './infrastructure/repositories/prisma-doctor-schedule.repository';
import { PrismaDoctorTimeOffRepository } from './infrastructure/repositories/prisma-doctor-time-off.repository';
import { APPOINTMENT_REPOSITORY_TOKEN } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { SLOT_APPOINTMENT_LOOKUP_TOKEN } from './application/ports/slot-appointment-lookup.port';
import { PrismaAppointmentReadRepository } from '@/domains/appointments/infrastructure/persistence/prisma-appointment-read.repository';
import { PrismaAppointmentWriteRepository } from '@/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository';
import { PrismaAppointmentRepository } from '@/domains/appointments/infrastructure/persistence/prisma-appointment.repository';
import { DOCTOR_VERIFICATION_REPOSITORY_TOKEN } from './core/repositories/doctor-verification.repository.interface';
import { PrismaDoctorVerificationRepository } from './infrastructure/repositories/prisma-doctor-verification.repository';
import { SIGNATURE_UPLOAD_REPOSITORY_TOKEN } from './core/repositories/signature-upload.repository.interface';
import { PrismaSignatureUploadRepository } from './infrastructure/repositories/prisma-signature-upload.repository';
import { DOCTOR_REPOSITORY_TOKEN } from './core/repositories/doctor.repository.interface';
import { PrismaDoctorRepository } from './infrastructure/repositories/prisma-doctor.repository';
import { DoctorVerificationHttpClient } from './infrastructure/external/doctor-verification-http.client';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [
    DoctorsOptionsController,
    DoctorsProfileController,
    DoctorsComplianceController,
    DoctorsCredentialsController,
    InternalDoctorsVerificationController,
    DoctorAvailabilityController,
    SignatureUploadController,
    ClinicSignatureController,
  ],
  providers: [
    { provide: DOCTOR_PERSISTENCE_PORT, useExisting: PrismaService },
    DoctorsService,
    DoctorsQueryService,
    DoctorsCommandService,
    DoctorAdminVerificationCommandService,
    DoctorProfileService,
    DoctorAvailabilityService,
    AvailabilityScheduleService,
    SlotGenerationService,
    DoctorVerificationHttpClient,
    DoctorVerificationService,
    SignatureUploadService,
    PrismaDoctorScheduleCoreRepository,
    PrismaDoctorTimeOffRepository,
    PrismaDoctorScheduleRepository,
    {
      provide: DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
      useExisting: PrismaDoctorScheduleRepository,
    },
    {
      provide: DOCTOR_SCHEDULE_CORE_REPOSITORY_TOKEN,
      useExisting: PrismaDoctorScheduleCoreRepository,
    },
    {
      provide: DOCTOR_TIME_OFF_REPOSITORY_TOKEN,
      useExisting: PrismaDoctorTimeOffRepository,
    },
    PrismaAppointmentReadRepository,
    PrismaAppointmentWriteRepository,
    PrismaAppointmentRepository,
    {
      provide: APPOINTMENT_REPOSITORY_TOKEN,
      useExisting: PrismaAppointmentRepository,
    },
    {
      provide: SLOT_APPOINTMENT_LOOKUP_TOKEN,
      useExisting: APPOINTMENT_REPOSITORY_TOKEN,
    },
    {
      provide: DOCTOR_VERIFICATION_REPOSITORY_TOKEN,
      useClass: PrismaDoctorVerificationRepository,
    },
    {
      provide: SIGNATURE_UPLOAD_REPOSITORY_TOKEN,
      useClass: PrismaSignatureUploadRepository,
    },
    {
      provide: DOCTOR_REPOSITORY_TOKEN,
      useClass: PrismaDoctorRepository,
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

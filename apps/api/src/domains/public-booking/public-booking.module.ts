import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { DoctorsModule } from '@/domains/doctors/doctors.module';
import { PatientsModule } from '@/domains/patients/patients.module';
import { AppointmentsModule } from '@/domains/appointments/appointments.module';
import { WhatsappModule } from '@/shared/modules/messaging/whatsapp/whatsapp.module';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { PublicBookingController } from '@/domains/public-booking/presentation/controllers/public-booking.controller';
import { PublicBookingService } from '@/domains/public-booking/application/services/public-booking.service';
import { PublicBookingSlotsService } from '@/domains/public-booking/application/services/public-booking-slots.service';
import { PublicBookingCreationService } from '@/domains/public-booking/application/services/public-booking-creation.service';
import { PublicBookingSubmitService } from '@/domains/public-booking/application/services/public-booking-submit.service';
import { TurnstileVerifyService } from '@/domains/public-booking/application/services/turnstile-verify.service';
import { PublicBookingTokenService } from '@/domains/public-booking/application/services/public-booking-token.service';

@Module({
  imports: [
    PrismaModule,
    AppConfigModule,
    AuthModule,
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    WhatsappModule,
    ComplianceModule,
  ],
  controllers: [PublicBookingController],
  providers: [
    PublicBookingService,
    PublicBookingSlotsService,
    PublicBookingCreationService,
    PublicBookingSubmitService,
    TurnstileVerifyService,
    PublicBookingTokenService,
  ],
})
export class PublicBookingModule {}

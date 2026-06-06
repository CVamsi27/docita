import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  StaffNotificationService,
  StaffNotificationRecipientResolver,
  StaffNotificationPolicyService,
  StaffNotificationWhatsAppDispatchService,
  StaffNotificationInboxService,
  PatientResponseConfirmationService,
  PatientResponseStaffNotificationService,
} from '@/domains/whatsapp/application/services';
import { StaffNotificationListener } from '@/domains/whatsapp/application/listeners/staff-notification.listener';
import { NOTIFICATION_RECIPIENT_RESOLVER_TOKEN } from '@/domains/whatsapp/application/ports/notification-recipient-resolver.port';

@Module({
  imports: [PrismaModule],
  providers: [
    StaffNotificationRecipientResolver,
    {
      provide: NOTIFICATION_RECIPIENT_RESOLVER_TOKEN,
      useExisting: StaffNotificationRecipientResolver,
    },
    StaffNotificationPolicyService,
    StaffNotificationWhatsAppDispatchService,
    StaffNotificationInboxService,
    PatientResponseConfirmationService,
    PatientResponseStaffNotificationService,
    StaffNotificationService,
    StaffNotificationListener,
  ],
  exports: [
    StaffNotificationService,
    PatientResponseConfirmationService,
    PatientResponseStaffNotificationService,
  ],
})
export class WhatsappNotificationsModule {}

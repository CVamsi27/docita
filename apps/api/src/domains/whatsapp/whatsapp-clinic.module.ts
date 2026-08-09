import { Module, forwardRef } from '@nestjs/common';
import {
  WhatsappService,
  WhatsappResendService,
  SystemEventsService,
  ApprovalService,
  MessagingService,
  TemplateMessageService,
  ResponseHandlerService,
  WhatsAppWebhookIngressService,
  PatientAppointmentResolverService,
  StaffNotificationService,
  StaffNotificationRecipientResolver,
  StaffNotificationPolicyService,
  StaffNotificationWhatsAppDispatchService,
  StaffNotificationInboxService,
  PatientResponseConfirmationService,
  PatientResponseStaffNotificationService,
} from '@/domains/whatsapp/application/services';
import { TemplatesFacadeService } from '@/shared/whatsapp/templates-facade.service';
import { WhatsappTemplatesModule } from '@/shared/whatsapp/whatsapp-templates.module';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { WhatsappClientAdapter } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.adapter';
import { WHATSAPP_CLIENT_TOKEN } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import {
  LegacyWhatsappTemplatesController,
  LegacyWhatsappSendController,
  LegacyWhatsappResendController,
  LegacyWhatsappLogsController,
  LegacyWhatsappApprovalController,
  LegacyWhatsappNotificationsController,
  StaffNotificationController,
} from '@/domains/whatsapp/presentation/controllers';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { NOTIFICATION_RECIPIENT_RESOLVER_TOKEN } from '@/domains/whatsapp/application/ports/notification-recipient-resolver.port';
import { WhatsappEventListener } from '@/domains/whatsapp/application/listeners/whatsapp-event.listener';
import { StaffNotificationListener } from '@/domains/whatsapp/application/listeners/staff-notification.listener';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';

@Module({
  imports: [
    PrismaModule,
    WhatsappTemplatesModule,
    forwardRef(() => SupportWhatsAppModule),
  ],
  controllers: [
    LegacyWhatsappTemplatesController,
    LegacyWhatsappSendController,
    LegacyWhatsappResendController,
    LegacyWhatsappLogsController,
    LegacyWhatsappApprovalController,
    LegacyWhatsappNotificationsController,
    StaffNotificationController,
  ],
  providers: [
    { provide: WHATSAPP_PERSISTENCE_PORT, useExisting: PrismaService },
    TemplatesFacadeService,

    WhatsappResendService,
    SystemEventsService,
    ApprovalService,
    MessagingService,
    TemplateMessageService,

    WhatsappService,

    WhatsappClientAdapter,
    {
      provide: WHATSAPP_CLIENT_TOKEN,
      useExisting: WhatsappClientAdapter,
    },
    HandleWebhookUseCase,
    WhatsAppWebhookIngressService,
    ResponseHandlerService,
    PatientAppointmentResolverService,
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
    WhatsappEventListener,
    StaffNotificationListener,
  ],
  exports: [
    WhatsappService,
    TemplatesFacadeService,
    WhatsappClientAdapter,
    {
      provide: WHATSAPP_CLIENT_TOKEN,
      useExisting: WhatsappClientAdapter,
    },
    WhatsAppWebhookIngressService,
    ResponseHandlerService,
    PatientAppointmentResolverService,
    StaffNotificationService,
    SystemEventsService,
  ],
})
export class WhatsappModule {}

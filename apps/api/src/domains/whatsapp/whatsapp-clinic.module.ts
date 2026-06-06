import { Module, forwardRef } from '@nestjs/common';
import {
  WhatsappService,
  TemplatesService as _TemplatesService,
  WhatsappResendService,
  SystemEventsService,
  ApprovalService,
  MessagingService,
  TemplateMessageService,
  WhatsappWebhookService,
  ResponseHandlerService,
  WhatsAppWebhookIngressService,
  StaffNotificationService,
  StaffNotificationRecipientResolver,
  StaffNotificationPolicyService,
  StaffNotificationWhatsAppDispatchService,
  StaffNotificationInboxService,
  PatientResponseConfirmationService,
  PatientResponseStaffNotificationService,
  PatientAppointmentResolverService,
} from '@/domains/whatsapp/application/services';
import { TemplatesFacadeService } from '@/shared/whatsapp/templates-facade.service';
import { WhatsappTemplatesModule } from '@/shared/whatsapp/whatsapp-templates.module';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { WhatsappClientAdapter } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.adapter';
import { WHATSAPP_CLIENT_TOKEN } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import {
  LegacyWhatsappTemplatesController,
  LegacyWhatsappSendController,
  LegacyWhatsappSettingsController,
  LegacyWhatsappResendController,
  LegacyWhatsappLogsController,
  LegacyWhatsappApprovalController,
  LegacyWhatsappNotificationsController,
  LegacyWhatsappWebhookController,
  StaffNotificationController,
} from '@/domains/whatsapp/presentation/controllers';
import { NOTIFICATION_RECIPIENT_RESOLVER_TOKEN } from '@/domains/whatsapp/application/ports/notification-recipient-resolver.port';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { WhatsappEventListener } from '@/domains/whatsapp/application/listeners/whatsapp-event.listener';
import { StaffNotificationListener } from '@/domains/whatsapp/application/listeners/staff-notification.listener';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';

/** Legacy clinic WhatsApp routes (`/whatsapp/*`, `/staff-notifications/*`, `/whatsapp/webhook`). */
@Module({
  imports: [
    PrismaModule,
    WhatsappTemplatesModule,
    forwardRef(() => SupportWhatsAppModule),
  ],
  controllers: [
    LegacyWhatsappTemplatesController,
    LegacyWhatsappSendController,
    LegacyWhatsappSettingsController,
    LegacyWhatsappResendController,
    LegacyWhatsappLogsController,
    LegacyWhatsappApprovalController,
    LegacyWhatsappNotificationsController,
    StaffNotificationController,
    LegacyWhatsappWebhookController,
  ],
  providers: [
    { provide: WHATSAPP_PERSISTENCE_PORT, useExisting: PrismaService },
    TemplatesFacadeService,
    { provide: 'TemplatesService', useClass: TemplatesFacadeService },

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
    WhatsappWebhookService,
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
    WhatsappWebhookService,
    WhatsAppWebhookIngressService,
    ResponseHandlerService,
    PatientAppointmentResolverService,
    StaffNotificationService,
    SystemEventsService,
  ],
})
export class WhatsappModule {}

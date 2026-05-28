import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { TemplatesService as _TemplatesService } from '@/domains/whatsapp/application/services/templates.service';
import { TemplatesFacadeService } from '@/shared/whatsapp/templates-facade.service';
import { WhatsappTemplatesModule } from '@/shared/whatsapp/whatsapp-templates.module';
import { WhatsappResendService } from '@/domains/whatsapp/application/services/resend.service';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { SystemEventsService } from '@/domains/whatsapp/application/services/system-events.service';
import { ApprovalService } from '@/domains/whatsapp/application/services/approval.service';
import { MessagingService } from '@/domains/whatsapp/application/services/messaging.service';
import { TemplateMessageService } from '@/domains/whatsapp/application/services/template-message.service';
import { WhatsappClientAdapter } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.adapter';
import { WHATSAPP_CLIENT_TOKEN } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { WhatsappWebhookService } from '@/domains/whatsapp/application/services/whatsapp-webhook.service';
import { LegacyWhatsappTemplatesController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-templates.controller';
import { LegacyWhatsappSendController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-send.controller';
import { LegacyWhatsappSettingsController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-settings.controller';
import { LegacyWhatsappResendController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-resend.controller';
import { LegacyWhatsappLogsController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-logs.controller';
import { LegacyWhatsappApprovalController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-approval.controller';
import { LegacyWhatsappNotificationsController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-notifications.controller';
import { LegacyWhatsappWebhookController } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-webhook.controller';
import { StaffNotificationController } from '@/domains/whatsapp/presentation/controllers/staff-notification.controller';
import { ResponseHandlerService } from '@/domains/whatsapp/application/services/response-handler.service';
import { WhatsAppWebhookIngressService } from '@/domains/whatsapp/application/services/whatsapp-webhook-ingress.service';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { StaffNotificationRecipientResolver } from '@/domains/whatsapp/application/services/staff-notification-recipient.resolver';
import { StaffNotificationPolicyService } from '@/domains/whatsapp/application/services/staff-notification-policy.service';
import { StaffNotificationWhatsAppDispatchService } from '@/domains/whatsapp/application/services/staff-notification-whatsapp-dispatch.service';
import { StaffNotificationInboxService } from '@/domains/whatsapp/application/services/staff-notification-inbox.service';
import { PatientResponseConfirmationService } from '@/domains/whatsapp/application/services/patient-response-confirmation.service';
import { PatientResponseStaffNotificationService } from '@/domains/whatsapp/application/services/patient-response-staff-notification.service';
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
    StaffNotificationService,
    SystemEventsService,
  ],
})
export class WhatsappModule {}

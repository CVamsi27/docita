import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  NotificationPriority,
  StaffNotificationType,
} from '@workspace/db';
import {
  NOTIFICATION_RECIPIENT_RESOLVER_TOKEN,
  type INotificationRecipientResolver,
} from '@/domains/whatsapp/application/ports/notification-recipient-resolver.port';
import { StaffNotificationPolicyService } from './staff-notification-policy.service';
import { StaffNotificationWhatsAppDispatchService } from './staff-notification-whatsapp-dispatch.service';
import { StaffNotificationInboxService } from './staff-notification-inbox.service';

export interface StaffNotificationPayload {
  clinicId: string;
  doctorId?: string;
  type: StaffNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  templateVariables?: Record<string, string>;
  sendWhatsApp?: boolean;
  sendInApp?: boolean;
}

/**
 * Facade — delegates inbox CRUD to StaffNotificationInboxService; orchestrates
 * outbound staff alerts via policy, recipient resolver, and WhatsApp dispatch.
 */
@Injectable()
export class StaffNotificationService {
  private readonly logger = new Logger(StaffNotificationService.name);

  constructor(
    @Inject(NOTIFICATION_RECIPIENT_RESOLVER_TOKEN)
    private readonly recipientResolver: INotificationRecipientResolver,
    private readonly policy: StaffNotificationPolicyService,
    private readonly whatsappDispatch: StaffNotificationWhatsAppDispatchService,
    private readonly inbox: StaffNotificationInboxService,
  ) {}

  async notifyStaff(payload: StaffNotificationPayload): Promise<void> {
    const {
      clinicId,
      doctorId,
      type,
      title,
      message,
      data = {},
      priority = 'NORMAL',
      templateVariables,
      sendWhatsApp = true,
      sendInApp = true,
    } = payload;

    if (!(await this.policy.isTierAllowed(clinicId, type))) {
      this.logger.debug(
        `Skipping notification ${type} for clinic ${clinicId}: tier below required minimum`,
      );
      return;
    }

    const isWhatsappEnabled = await this.policy.isWhatsappEnabled(clinicId);

    const recipients = await this.recipientResolver.resolveStaffRecipients(
      clinicId,
      doctorId,
      type,
    );

    if (recipients.length === 0) {
      this.logger.warn(
        `No recipients found for notification type ${type} in clinic ${clinicId}`,
      );
      return;
    }

    const notificationPromises: Promise<void>[] = [];

    for (const recipient of recipients) {
      if (sendInApp) {
        notificationPromises.push(
          this.inbox.createInAppNotification(
            recipient.id,
            clinicId,
            type,
            title,
            message,
            data,
            priority,
          ),
        );
      }

      if (sendWhatsApp && isWhatsappEnabled && recipient.phoneNumber) {
        notificationPromises.push(
          this.whatsappDispatch.sendStaffAlert(
            recipient.phoneNumber,
            clinicId,
            title,
            message,
            templateVariables,
          ),
        );
      }
    }

    await Promise.allSettled(notificationPromises);

    this.logger.log(
      `Sent ${type} notification to ${recipients.length} staff members in clinic ${clinicId}`,
    );
  }

  async getAllNotifications(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    return this.inbox.getAllNotifications(userId, options);
  }

  async getUnreadNotifications(userId: string, limit = 20) {
    return this.inbox.getUnreadNotifications(userId, limit);
  }

  async markNotificationRead(notificationId: string, userId: string) {
    return this.inbox.markNotificationRead(notificationId, userId);
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.inbox.deleteNotification(notificationId, userId);
  }

  async deleteAllNotifications(userId: string, clinicId: string) {
    return this.inbox.deleteAllNotifications(userId, clinicId);
  }

  async getUnreadCount(userId: string) {
    return this.inbox.getUnreadCount(userId);
  }

  async sendApprovalRequest(
    clinicId: string,
    type: 'prescription' | 'invoice',
    itemId: string,
    patientName: string,
    requestedBy: string,
  ): Promise<void> {
    const notificationType: StaffNotificationType =
      type === 'prescription' ? 'PRESCRIPTION_PENDING' : 'INVOICE_PENDING';

    await this.notifyStaff({
      clinicId,
      type: notificationType,
      title: `${type === 'prescription' ? 'Prescription' : 'Invoice'} Approval Required`,
      message: `${requestedBy} is requesting approval to send ${type} to ${patientName} via WhatsApp`,
      data: {
        [`${type}Id`]: itemId,
        patientName,
        requestedBy,
        action: 'approval_required',
      },
      priority: 'HIGH',
      templateVariables: {
        patientName,
        requestedBy,
        type,
        itemId,
      },
    });
  }

  async notifyDeliverySuccess(
    clinicId: string,
    type: 'prescription' | 'invoice',
    itemId: string,
    patientName: string,
    sentTo: string,
  ): Promise<void> {
    await this.notifyStaff({
      clinicId,
      type: 'SYSTEM_ALERT',
      title: `${type === 'prescription' ? 'Prescription' : 'Invoice'} Sent`,
      message: `${type === 'prescription' ? 'Prescription' : 'Invoice'} successfully sent to ${patientName} (${sentTo}) via WhatsApp`,
      data: {
        [`${type}Id`]: itemId,
        patientName,
        sentTo,
        action: 'delivery_success',
      },
      priority: 'LOW',
      sendWhatsApp: false,
    });
  }
}

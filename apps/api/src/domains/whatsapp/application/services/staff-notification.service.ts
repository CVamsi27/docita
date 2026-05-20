import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { PrismaService } from '@/prisma/prisma.service';
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
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

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

function parseNotificationData(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.fromEntries(Object.entries(parsed));
      }
      return {};
    } catch {
      return {};
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }

  return {};
}

/**
 * Facade — delegates policy and WhatsApp dispatch to StaffNotificationPolicyService
 * and StaffNotificationWhatsAppDispatchService.
 */
@Injectable()
export class StaffNotificationService {
  private readonly logger = new Logger(StaffNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_RECIPIENT_RESOLVER_TOKEN)
    private readonly recipientResolver: INotificationRecipientResolver,
    private readonly policy: StaffNotificationPolicyService,
    private readonly whatsappDispatch: StaffNotificationWhatsAppDispatchService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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
          this.createInAppNotification(
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

  private async createInAppNotification(
    userId: string,
    clinicId: string,
    type: StaffNotificationType,
    title: string,
    message: string,
    data: Record<string, unknown>,
    priority: NotificationPriority,
  ): Promise<void> {
    try {
      const notification = await this.prisma.staffNotification.create({
        data: {
          clinicId,
          userId,
          type,
          title,
          message,
          data: JSON.stringify(data),
          priority,
          isRead: false,
        },
      });

      this.eventEmitter.emit(ApplicationEvents.NOTIFICATION_CREATED, {
        clinicId,
        userId,
        notification: {
          ...notification,
          data: parseNotificationData(notification.data),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification for user ${userId}`,
        error,
      );
    }
  }

  async getAllNotifications(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<
    Array<{
      id: string;
      clinicId: string;
      userId: string | null;
      type: StaffNotificationType;
      title: string;
      message: string;
      data: unknown;
      priority: NotificationPriority;
      isRead: boolean;
      readAt: Date | null;
      deletedAt: Date | null;
      createdAt: Date;
    }>
  > {
    const { limit = 100, offset = 0 } = options;
    const notifications = await this.prisma.staffNotification.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        clinicId: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        data: true,
        priority: true,
        isRead: true,
        readAt: true,
        deletedAt: true,
        createdAt: true,
      },
    });

    return notifications.map((n) => ({
      ...n,
      data: parseNotificationData(n.data),
    }));
  }

  async getUnreadNotifications(
    userId: string,
    limit = 20,
  ): Promise<
    Array<{
      id: string;
      clinicId: string;
      userId: string | null;
      type: StaffNotificationType;
      title: string;
      message: string;
      data: unknown;
      priority: NotificationPriority;
      isRead: boolean;
      readAt: Date | null;
      deletedAt: Date | null;
      createdAt: Date;
    }>
  > {
    const notifications = await this.prisma.staffNotification.findMany({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        clinicId: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        data: true,
        priority: true,
        isRead: true,
        readAt: true,
        deletedAt: true,
        createdAt: true,
      },
    });

    return notifications.map((n) => ({
      ...n,
      data: parseNotificationData(n.data),
    }));
  }

  async markNotificationRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.prisma.staffNotification.findFirst({
      where: { id: notificationId, userId, deletedAt: null },
      select: { clinicId: true },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.staffNotification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { isRead: true, readAt: this.clock.now() },
    });

    this.eventEmitter.emit(ApplicationEvents.NOTIFICATION_READ, {
      clinicId: existing.clinicId,
      userId,
      notificationId,
    });
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.prisma.staffNotification.findFirst({
      where: { id: notificationId, userId, deletedAt: null },
      select: { clinicId: true },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.staffNotification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { deletedAt: this.clock.now() },
    });

    this.eventEmitter.emit(ApplicationEvents.NOTIFICATION_DELETED, {
      clinicId: existing.clinicId,
      userId,
      notificationId,
    });
  }

  async deleteAllNotifications(
    userId: string,
    clinicId: string,
  ): Promise<void> {
    await this.prisma.staffNotification.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: this.clock.now() },
    });

    this.eventEmitter.emit(ApplicationEvents.NOTIFICATION_BULK_DELETED, {
      clinicId,
      userId,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.staffNotification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
    });
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

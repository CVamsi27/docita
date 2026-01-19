import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappTemplatesService } from './templates.service';
import { Prisma } from '@workspace/db';
import type {
  StaffNotificationType,
  NotificationPriority,
  Role,
} from '@workspace/db';

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
 * Service to send notifications to clinic staff
 * Supports both WhatsApp and in-app notifications
 */
@Injectable()
export class StaffNotificationService {
  private readonly logger = new Logger(StaffNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly templatesService: WhatsappTemplatesService,
  ) {}

  /**
   * Send notification to relevant staff members
   * By default, sends both WhatsApp and in-app notifications
   */
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

    // Get staff members who should receive this notification
    const recipients = await this.getRecipients(clinicId, doctorId, type);

    if (recipients.length === 0) {
      this.logger.warn(
        `No recipients found for notification type ${type} in clinic ${clinicId}`,
      );
      return;
    }

    // Send notifications in parallel
    const notificationPromises: Promise<void>[] = [];

    for (const recipient of recipients) {
      // Create in-app notification
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

      // Send WhatsApp notification
      if (sendWhatsApp && recipient.phoneNumber) {
        notificationPromises.push(
          this.sendWhatsAppNotification(
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

  /**
   * Get list of staff members who should receive the notification
   */
  private async getRecipients(
    clinicId: string,
    doctorId: string | undefined,
    type: StaffNotificationType,
  ): Promise<Array<{ id: string; phoneNumber: string | null }>> {
    // Determine which roles should receive this notification
    const targetRoles = this.getTargetRoles(type);

    // Build query conditions
    const where: Prisma.UserWhereInput = {
      clinicId,
      role: { in: targetRoles },
    };

    // For doctor-specific notifications, include the doctor
    if (doctorId && !targetRoles.includes('DOCTOR' as Role)) {
      // Include both role-based staff AND the specific doctor
      const users = await this.prisma.user.findMany({
        where: {
          OR: [where, { id: doctorId, clinicId }],
        },
        select: {
          id: true,
          phoneNumber: true,
        },
      });
      return users;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        phoneNumber: true,
      },
    });

    return users;
  }

  /**
   * Determine which roles should receive a notification type
   */
  private getTargetRoles(type: StaffNotificationType): Role[] {
    // Define notification routing by type (matching schema enum values)
    // Valid roles: DOCTOR, RECEPTIONIST, ADMIN, SUPER_ADMIN, ADMIN_DOCTOR
    const routingMap: Partial<Record<StaffNotificationType, Role[]>> = {
      PATIENT_RESPONSE: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_CANCEL: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR', 'DOCTOR'],
      APPOINTMENT_DELAY: ['RECEPTIONIST', 'ADMIN_DOCTOR', 'DOCTOR'],
      PRESCRIPTION_PENDING: ['DOCTOR', 'ADMIN_DOCTOR'],
      INVOICE_PENDING: ['ADMIN', 'ADMIN_DOCTOR'],
      SYSTEM_ALERT: ['ADMIN', 'ADMIN_DOCTOR'],
    };

    return routingMap[type] || ['ADMIN', 'ADMIN_DOCTOR'];
  }

  /**
   * Create an in-app notification
   */
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
      await this.prisma.staffNotification.create({
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
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification for user ${userId}: ${error}`,
      );
    }
  }

  /**
   * Send WhatsApp notification to staff member
   */
  private async sendWhatsAppNotification(
    phoneNumber: string,
    clinicId: string,
    title: string,
    message: string,
    templateVariables?: Record<string, string>,
  ): Promise<void> {
    try {
      // Try to use template first
      if (templateVariables) {
        const resolved = await this.templatesService.resolveTemplate(
          'staff_notification',
          {
            ...templateVariables,
            title,
            message,
          },
          clinicId,
        );

        if (resolved) {
          const messageContent =
            this.templatesService.getMessageForMode(resolved);
          await this.whatsappService.sendMessage({
            to: phoneNumber,
            message: messageContent,
          });
          return;
        }
      }

      // Fallback to simple message
      const formattedMessage = `🔔 *Staff Alert*\n\n*${title}*\n\n${message}`;
      await this.whatsappService.sendMessage({
        to: phoneNumber,
        message: formattedMessage,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp notification to ${phoneNumber}: ${error}`,
      );
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(
    userId: string,
    limit = 20,
  ): Promise<
    Array<{
      id: string;
      type: StaffNotificationType;
      title: string;
      message: string;
      data: unknown;
      priority: NotificationPriority;
      createdAt: Date;
    }>
  > {
    const notifications = await this.prisma.staffNotification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        data: true,
        priority: true,
        createdAt: true,
      },
    });

    return notifications.map((n) => ({
      ...n,
      data: n.data ? JSON.parse(n.data as string) : {},
    }));
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    await this.prisma.staffNotification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.staffNotification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.staffNotification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Send approval request notification
   */
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

  /**
   * Notify about successful prescription/invoice delivery
   */
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
      sendWhatsApp: false, // Only in-app for delivery confirmations
    });
  }
}

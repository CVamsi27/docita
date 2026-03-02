import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { TemplatesService } from './templates.service';
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

@Injectable()
export class StaffNotificationService {
  private readonly logger = new Logger(StaffNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientService,
    private readonly templatesService: TemplatesService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  private async isWhatsappEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      typeof clinic.whatsappAutomation !== 'object'
    ) {
      return true;
    }

    const automation = clinic.whatsappAutomation as { enabled?: boolean };
    return automation.enabled !== false;
  }

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

    const isWhatsappEnabled = await this.isWhatsappEnabled(clinicId);

    const recipients = await this.getRecipients(clinicId, doctorId, type);

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

  private async getRecipients(
    clinicId: string,
    doctorId: string | undefined,
    type: StaffNotificationType,
  ): Promise<Array<{ id: string; phoneNumber: string | null }>> {
    const targetRoles = this.getTargetRoles(type);

    const where: Prisma.UserWhereInput = {
      clinicId,
      role: { in: targetRoles },
    };

    if (doctorId && !targetRoles.includes('DOCTOR' as Role)) {
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

  private getTargetRoles(type: StaffNotificationType): Role[] {
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
        `Failed to create in-app notification for user ${userId}`,
        error,
      );
    }
  }

  private async sendWhatsAppNotification(
    phoneNumber: string,
    clinicId: string,
    title: string,
    message: string,
    templateVariables?: Record<string, string>,
  ): Promise<void> {
    try {
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
          await this.whatsappClient.sendMessage({
            to: phoneNumber,
            message: messageContent,
          });
          return;
        }
      }

      const formattedMessage = `*Staff Alert*\n\n*${title}*\n\n${message}`;
      await this.whatsappClient.sendMessage({
        to: phoneNumber,
        message: formattedMessage,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp notification to ${phoneNumber}`,
        error,
      );
    }
  }

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
      data: parseNotificationData(n.data),
    }));
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.prisma.staffNotification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await this.prisma.staffNotification.deleteMany({
      where: {
        userId,
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.staffNotification.count({
      where: {
        userId,
        isRead: false,
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

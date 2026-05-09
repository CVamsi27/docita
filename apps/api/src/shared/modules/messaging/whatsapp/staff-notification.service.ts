import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { TemplatesService } from './templates.service';
import { Prisma } from '@workspace/db';
import type {
  ClinicTier,
  StaffNotificationType,
  NotificationPriority,
  Role,
} from '@workspace/db';
import { isFrontDeskWorkspace, parseWorkspaceProfile } from '@workspace/types';

/**
 * Minimum clinic tier required for a notification type to be delivered.
 * Types absent from this map deliver at every tier. FRONT_DESK is treated as
 * STARTER-equivalent for ordering — feature availability is enforced
 * separately by the workspace profile / role map.
 */
const NOTIFICATION_TYPE_MIN_TIER: Partial<
  Record<StaffNotificationType, ClinicTier>
> = {
  PATIENT_RESPONSE: 'ESSENTIAL',
  INVOICE_PENDING: 'ESSENTIAL',
  INVOICE_SENT: 'ESSENTIAL',
  INVOICE_FAILED: 'ESSENTIAL',
  PAYMENT_PROVIDER_STATUS_UPDATE: 'PROFESSIONAL',
};

const TIER_RANK: Record<ClinicTier, number> = {
  STARTER: 0,
  FRONT_DESK: 0,
  ESSENTIAL: 1,
  PROFESSIONAL: 2,
  HOSPITAL: 3,
  ENTERPRISE: 4,
};

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async isTierAllowed(
    clinicId: string,
    type: StaffNotificationType,
  ): Promise<boolean> {
    const required = NOTIFICATION_TYPE_MIN_TIER[type];
    if (!required) return true;

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true },
    });
    if (!clinic) return false;

    return TIER_RANK[clinic.tier] >= TIER_RANK[required];
  }

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

    if (!(await this.isTierAllowed(clinicId, type))) {
      this.logger.debug(
        `Skipping notification ${type} for clinic ${clinicId}: tier below required minimum`,
      );
      return;
    }

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
    const targetRoles = await this.getTargetRolesForClinic(clinicId, type);

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
      APPOINTMENT_REQUEST_CREATED: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_REQUEST_APPROVED: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_REQUEST_REJECTED: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_RESCHEDULED: [
        'RECEPTIONIST',
        'ADMIN',
        'ADMIN_DOCTOR',
        'DOCTOR',
      ],
      APPOINTMENT_NO_SHOW: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR', 'DOCTOR'],
      APPOINTMENT_CONFIRMED: [
        'RECEPTIONIST',
        'ADMIN',
        'ADMIN_DOCTOR',
        'DOCTOR',
      ],
      PRESCRIPTION_SENT: ['DOCTOR', 'ADMIN_DOCTOR'],
      PRESCRIPTION_FAILED: ['DOCTOR', 'ADMIN_DOCTOR'],
      INVOICE_SENT: ['ADMIN', 'ADMIN_DOCTOR'],
      INVOICE_FAILED: ['ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_DUE_SOON: ['ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_OVERDUE: ['ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_SUCCESS: ['ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_FAILED: ['ADMIN', 'ADMIN_DOCTOR'],
      PAYMENT_PROVIDER_STATUS_UPDATE: ['ADMIN', 'ADMIN_DOCTOR'],
      CONSULTATION_STARTED: ['DOCTOR', 'ADMIN_DOCTOR'],
      CONSULTATION_SIGNED: ['DOCTOR', 'ADMIN_DOCTOR'],
      CONSULTATION_PENDING_ACTION: ['DOCTOR', 'ADMIN_DOCTOR'],
    };

    return routingMap[type] || ['ADMIN', 'ADMIN_DOCTOR'];
  }

  private async getTargetRolesForClinic(
    clinicId: string,
    type: StaffNotificationType,
  ): Promise<Role[]> {
    const base = this.getTargetRoles(type);
    if (type !== 'PRESCRIPTION_PENDING') {
      return base;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const raw =
      clinic?.settings && typeof clinic.settings === 'object'
        ? (clinic.settings as Record<string, unknown>)
        : {};
    if (isFrontDeskWorkspace(parseWorkspaceProfile(raw.workspaceProfile))) {
      return ['ADMIN', 'ADMIN_DOCTOR', 'RECEPTIONIST'];
    }

    return base;
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

      this.eventEmitter.emit('notification.created', {
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
      data: { isRead: true, readAt: new Date() },
    });

    this.eventEmitter.emit('notification.read', {
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
      data: { deletedAt: new Date() },
    });

    this.eventEmitter.emit('notification.deleted', {
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
      data: { deletedAt: new Date() },
    });

    this.eventEmitter.emit('notification.bulk-deleted', { clinicId, userId });
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

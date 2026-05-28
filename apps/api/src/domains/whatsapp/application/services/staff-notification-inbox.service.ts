import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import type {
  NotificationPriority,
  StaffNotificationType,
} from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { parseNotificationData } from './staff-notification-data.helper';

@Injectable()
/**
 * Facade for staff notification inbox actions; persistence, event delivery, and
 * notification data parsing stay behind injected collaborators.
 */
export class StaffNotificationInboxService {
  private readonly logger = new Logger(StaffNotificationInboxService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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
    const notifications = await this.persistence.staffNotification.findMany({
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
    const notifications = await this.persistence.staffNotification.findMany({
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
    const existing = await this.persistence.staffNotification.findFirst({
      where: { id: notificationId, userId, deletedAt: null },
      select: { clinicId: true },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.persistence.staffNotification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { isRead: true, readAt: this.clock.now() },
    });

    // allow-direct-emit: websocket fan-out only; persisted inbox state is authoritative.
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
    const existing = await this.persistence.staffNotification.findFirst({
      where: { id: notificationId, userId, deletedAt: null },
      select: { clinicId: true },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.persistence.staffNotification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { deletedAt: this.clock.now() },
    });

    // allow-direct-emit: websocket fan-out only; deletedAt filter is authoritative.
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
    await this.persistence.staffNotification.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: this.clock.now() },
    });

    // allow-direct-emit: websocket fan-out only; inbox reload recovers missed emits.
    this.eventEmitter.emit(ApplicationEvents.NOTIFICATION_BULK_DELETED, {
      clinicId,
      userId,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.persistence.staffNotification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
    });
  }

  async createInAppNotification(
    userId: string,
    clinicId: string,
    type: StaffNotificationType,
    title: string,
    message: string,
    data: Record<string, unknown>,
    priority: NotificationPriority,
  ): Promise<void> {
    try {
      const notification = await this.persistence.staffNotification.create({
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

      // allow-direct-emit: websocket fan-out only; persisted notification row is authoritative.
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
}

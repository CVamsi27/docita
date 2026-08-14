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

/**
 * Shape returned by both inbox listing queries (`getAllNotifications`,
 * `getUnreadNotifications`). Defining the row type and Prisma `select` once
 * keeps the two queries' projections — and their `parseNotificationData`
 * post-processing — structurally guaranteed to match instead of copy-pasted.
 */
type StaffNotificationListItem = {
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
};

const STAFF_NOTIFICATION_LIST_SELECT = {
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
} as const;

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

  private withParsedNotificationData(
    notifications: StaffNotificationListItem[],
  ): StaffNotificationListItem[] {
    return notifications.map((notification) => ({
      ...notification,
      data: parseNotificationData(notification.data),
    }));
  }

  /**
   * Confirms the notification exists, is owned by `userId`, and isn't already
   * soft-deleted — the guard every mutating inbox action needs before it
   * touches a row or emits a fan-out event. Returns the `clinicId` the caller
   * needs for that event payload.
   */
  private async assertNotificationOwnedByUser(
    notificationId: string,
    userId: string,
  ): Promise<{ clinicId: string }> {
    const existing = await this.persistence.staffNotification.findFirst({
      where: { id: notificationId, userId, deletedAt: null },
      select: { clinicId: true },
    });

    if (!existing) throw new NotFoundException('Notification not found');
    return existing;
  }

  async getAllNotifications(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<StaffNotificationListItem[]> {
    const { limit = 100, offset = 0 } = options;
    const notifications = await this.persistence.staffNotification.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
      select: STAFF_NOTIFICATION_LIST_SELECT,
    });

    return this.withParsedNotificationData(notifications);
  }

  async getUnreadNotifications(
    userId: string,
    limit = 20,
  ): Promise<StaffNotificationListItem[]> {
    const notifications = await this.persistence.staffNotification.findMany({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: STAFF_NOTIFICATION_LIST_SELECT,
    });

    return this.withParsedNotificationData(notifications);
  }

  /**
   * Shared tail of every single-notification mutation: confirm ownership,
   * apply the caller's field patch, and fan out the matching event. Read and
   * delete differ only in *what* changes on the row and *which* event follows
   * — both captured by the two parameters — so collapsing them here keeps
   * the guard-update-emit sequence defined exactly once.
   */
  private async mutateNotificationAndEmit(
    notificationId: string,
    userId: string,
    patch: { isRead: true; readAt: Date } | { deletedAt: Date },
    event:
      | ApplicationEvents.NOTIFICATION_READ
      | ApplicationEvents.NOTIFICATION_DELETED,
  ): Promise<void> {
    const { clinicId } = await this.assertNotificationOwnedByUser(
      notificationId,
      userId,
    );

    await this.persistence.staffNotification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: patch,
    });

    // allow-direct-emit: websocket fan-out only; persisted inbox state is authoritative.
    this.eventEmitter.emit(event, { clinicId, userId, notificationId });
  }

  async markNotificationRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.mutateNotificationAndEmit(
      notificationId,
      userId,
      { isRead: true, readAt: this.clock.now() },
      ApplicationEvents.NOTIFICATION_READ,
    );
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.mutateNotificationAndEmit(
      notificationId,
      userId,
      { deletedAt: this.clock.now() },
      ApplicationEvents.NOTIFICATION_DELETED,
    );
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

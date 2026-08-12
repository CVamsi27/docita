import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UseGuards } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { getWebSocketCorsOrigins } from '@/shared/modules/config/app-config';
import { WsJwtAuthGuard } from '@/shared/modules/auth/auth/ws-jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { StaffNotificationType, NotificationPriority } from '@workspace/db';
import { BaseWebSocketGateway } from './base-websocket.gateway';

export interface NotificationData {
  id: string;
  clinicId: string;
  userId: string | null;
  type: StaffNotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: getWebSocketCorsOrigins(),
    credentials: true,
  },
})
@UseGuards(WsJwtAuthGuard)
export class NotificationsGateway
  extends BaseWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  protected readonly logger = new Logger('NotificationsGateway');
  protected readonly RATE_LIMIT_MESSAGES = 20;

  constructor(
    protected readonly jwtService: JwtService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    super();
  }

  async handleConnection(client: Socket) {
    await this.authenticateConnection(client, {
      noTokenWarning: 'Notification connection attempt without token',
      unauthorizedWarning: 'Unauthorized notification connection attempt',
      onAuthenticated: (joiningClient, payload) => {
        joiningClient.join(`clinic:${payload.clinicId}`);
        joiningClient.join(`user:${payload.sub}`);

        this.logger.log(
          `Client connected and subscribed to notifications: ${joiningClient.id} (${payload.email})`,
        );
      },
    });
  }

  override handleDisconnect(client: Socket) {
    this.rateLimitMap.delete(client.id);
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
  }

  @SubscribeMessage('notifications:subscribe')
  handleSubscribe(client: Socket) {
    const rateLimitError = this.rejectIfRateLimited(client);
    if (rateLimitError) return rateLimitError;

    const user = client.data.user;
    this.logger.log(
      `Client ${client.id} explicitly subscribed to notifications for user ${user.sub}`,
    );
    return {
      event: 'subscribed',
      data: { userId: user.sub, clinicId: user.clinicId },
    };
  }

  @OnEvent(ApplicationEvents.NOTIFICATION_CREATED)
  handleNotificationCreated(payload: {
    clinicId: string;
    userId: string;
    notification: NotificationData;
  }) {
    this.emitNotification(
      payload.clinicId,
      payload.userId,
      payload.notification,
    );
  }

  @OnEvent(ApplicationEvents.NOTIFICATION_READ)
  handleNotificationRead(payload: {
    clinicId: string;
    userId: string;
    notificationId: string;
  }) {
    this.emitNotificationRead(
      payload.clinicId,
      payload.userId,
      payload.notificationId,
    );
  }

  @OnEvent(ApplicationEvents.NOTIFICATION_DELETED)
  handleNotificationDeleted(payload: {
    clinicId: string;
    userId: string;
    notificationId: string;
  }) {
    this.emitNotificationDeleted(
      payload.clinicId,
      payload.userId,
      payload.notificationId,
    );
  }

  @OnEvent(ApplicationEvents.NOTIFICATION_BULK_DELETED)
  handleBulkDeleted(payload: { clinicId: string; userId: string }) {
    this.emitBulkDelete(payload.clinicId, payload.userId);
  }

  private emitNotification(
    clinicId: string,
    userId: string | null,
    notification: NotificationData,
  ) {
    if (userId) {
      this.server.to(`user:${userId}`).emit('notification:new', notification);
      this.logger.log(
        `Emitted notification ${notification.id} to user ${userId}`,
      );
    } else {
      this.server
        .to(`clinic:${clinicId}`)
        .emit('notification:new', notification);
      this.logger.log(
        `Emitted notification ${notification.id} to clinic ${clinicId}`,
      );
    }
  }

  private emitNotificationDeleted(
    clinicId: string,
    userId: string | null,
    notificationId: string,
  ) {
    const data = { id: notificationId };
    if (userId) {
      this.server.to(`user:${userId}`).emit('notification:deleted', data);
      this.logger.log(`Emitted deletion for notification ${notificationId}`);
    } else {
      this.server.to(`clinic:${clinicId}`).emit('notification:deleted', data);
    }
  }

  private emitNotificationRead(
    clinicId: string,
    userId: string | null,
    notificationId: string,
  ) {
    const data = { id: notificationId, readAt: this.clock.now() };
    if (userId) {
      this.server.to(`user:${userId}`).emit('notification:read', data);
      this.logger.log(`Emitted read status for notification ${notificationId}`);
    } else {
      this.server.to(`clinic:${clinicId}`).emit('notification:read', data);
    }
  }

  private emitBulkDelete(clinicId: string, userId: string) {
    this.server.to(`user:${userId}`).emit('notification:bulk-delete', {
      userId,
      timestamp: this.clock.now(),
    });
    this.logger.log(`Emitted bulk delete for user ${userId}`);
  }
}

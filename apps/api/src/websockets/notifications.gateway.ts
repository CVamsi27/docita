import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UseGuards } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { getWebSocketCorsOrigins } from '@/shared/modules/config/app-config';
import { WsJwtAuthGuard } from '@/shared/modules/auth/auth/ws-jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { StaffNotificationType, NotificationPriority } from '@workspace/db';

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

interface RateLimitTracker {
  messageCount: number;
  resetTime: number;
}

@WebSocketGateway({
  cors: {
    origin: getWebSocketCorsOrigins(),
    credentials: true,
  },
})
@UseGuards(WsJwtAuthGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('NotificationsGateway');
  private readonly RATE_LIMIT_MESSAGES = 20;
  private readonly RATE_LIMIT_WINDOW_MS = 60000;
  private rateLimitMap = new Map<string, RateLimitTracker>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async handleConnection(client: Socket) {
    const authToken =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!authToken) {
      this.logger.warn(
        `Notification connection attempt without token: ${client.id}`,
      );
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(authToken);
      client.data.user = payload;

      this.rateLimitMap.set(client.id, {
        messageCount: 0,
        resetTime: Date.now() + this.RATE_LIMIT_WINDOW_MS,
      });

      client.join(`clinic:${payload.clinicId}`);
      client.join(`user:${payload.sub}`);

      this.logger.log(
        `Client connected and subscribed to notifications: ${client.id} (${payload.email})`,
      );
    } catch {
      this.logger.warn(
        `Unauthorized notification connection attempt: ${client.id}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.rateLimitMap.delete(client.id);
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
  }

  private checkRateLimit(clientId: string): boolean {
    const tracker = this.rateLimitMap.get(clientId);
    if (!tracker) return true;

    const now = Date.now();
    if (now > tracker.resetTime) {
      tracker.messageCount = 0;
      tracker.resetTime = now + this.RATE_LIMIT_WINDOW_MS;
    }

    if (tracker.messageCount >= this.RATE_LIMIT_MESSAGES) {
      return false;
    }

    tracker.messageCount++;
    return true;
  }

  private emitRateLimitError(client: Socket): void {
    client.emit('error', {
      message: `Rate limit exceeded. Maximum ${this.RATE_LIMIT_MESSAGES} messages per ${this.RATE_LIMIT_WINDOW_MS / 1000}s allowed.`,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  @SubscribeMessage('notifications:subscribe')
  handleSubscribe(client: Socket) {
    if (!this.checkRateLimit(client.id)) {
      this.emitRateLimitError(client);
      return { event: 'error', data: { message: 'Rate limit exceeded' } };
    }

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

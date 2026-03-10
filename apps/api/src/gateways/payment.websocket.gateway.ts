import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Logger,
  UseGuards,
  BadRequestException as _BadRequestException,
} from '@nestjs/common';
import { getWebSocketCorsOrigins } from '@/shared/modules/config/app-config';
import { WsJwtAuthGuard } from '@/shared/modules/auth/auth/ws-jwt-auth.guard';
import {
  ClinicTier,
  SubscriptionStatus,
  InvoiceStatus as _InvoiceStatus,
  PaymentSessionStatus,
} from '@workspace/db';

export interface PaymentUpdateData {
  sessionId: string;
  invoiceId: string | null;
  status: PaymentSessionStatus;
  paidAt?: Date;
}

export interface ClinicUpdateData {
  clinicId: string;
  tier?: ClinicTier;
  intelligenceAddon?: string;
  subscriptionStatus?: SubscriptionStatus;
}

interface RateLimitTracker {
  messageCount: number;
  resetTime: number;
}

import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: getWebSocketCorsOrigins(),
    credentials: true,
  },
})
@UseGuards(WsJwtAuthGuard)
export class PaymentWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('PaymentGateway');
  private readonly RATE_LIMIT_MESSAGES = 10;
  private readonly RATE_LIMIT_WINDOW_MS = 60000;
  private rateLimitMap = new Map<string, RateLimitTracker>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const authToken =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!authToken) {
      this.logger.warn(`Connection attempt without token: ${client.id}`);
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
      this.logger.log(
        `Client connected and authenticated: ${client.id} (${payload.email})`,
      );
    } catch (_err) {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.rateLimitMap.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
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

  @SubscribeMessage('subscribe:clinic')
  handleSubscribeClinic(client: Socket, clinicId: string) {
    if (!this.checkRateLimit(client.id)) {
      this.emitRateLimitError(client);
      return { event: 'error', data: { message: 'Rate limit exceeded' } };
    }

    const user = client.data.user;

    if (user.role !== 'SUPER_ADMIN' && user.clinicId !== clinicId) {
      this.logger.warn(
        `Unauthorized subscription attempt: User ${user.email} (clinic: ${user.clinicId}) tried to subscribe to clinic: ${clinicId}`,
      );
      return { event: 'error', data: { message: 'Unauthorized' } };
    }

    client.join(`clinic:${clinicId}`);
    this.logger.log(`Client ${client.id} subscribed to clinic:${clinicId}`);
    return { event: 'subscribed', data: { clinicId } };
  }

  @SubscribeMessage('subscribe:invoice')
  async handleSubscribeInvoice(client: Socket, invoiceId: string) {
    if (!this.checkRateLimit(client.id)) {
      this.emitRateLimitError(client);
      return { event: 'error', data: { message: 'Rate limit exceeded' } };
    }

    const user = client.data.user;

    if (user.role !== 'SUPER_ADMIN') {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          patient: {
            clinicId: user.clinicId,
          },
        },
        select: { id: true },
      });

      if (!invoice) {
        this.logger.warn(
          `Unauthorized invoice subscription attempt: User ${user.email} (clinic: ${user.clinicId}) tried to subscribe to invoice: ${invoiceId}`,
        );
        return {
          event: 'error',
          data: { message: 'Unauthorized or Invoice not found' },
        };
      }
    }

    client.join(`invoice:${invoiceId}`);
    this.logger.log(`Client ${client.id} subscribed to invoice:${invoiceId}`);
    return { event: 'subscribed', data: { invoiceId } };
  }

  emitPaymentUpdate(
    clinicId: string,
    sessionId: string,
    data: PaymentUpdateData,
  ) {
    this.server.to(`clinic:${clinicId}`).emit('payment:update', data);
    if (data.invoiceId) {
      this.server.to(`invoice:${data.invoiceId}`).emit('payment:update', data);
    }
    this.logger.log(`Emitted payment update for session ${sessionId}`);
  }

  emitClinicUpdate(clinicId: string, data: ClinicUpdateData) {
    this.server.to(`clinic:${clinicId}`).emit('clinic:update', data);
    this.logger.log(
      `Emitted clinic update for clinic ${clinicId}: ${JSON.stringify(data)}`,
    );
  }
}

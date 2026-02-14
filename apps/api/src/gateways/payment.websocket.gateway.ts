import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, BadRequestException } from '@nestjs/common';
import { getWebSocketCorsOrigins } from '../common/config/app-config';
import { WsJwtAuthGuard } from '../modules/auth/ws-jwt-auth.guard';
import {
  ClinicTier,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentSessionStatus,
} from '@workspace/db';

interface PaymentUpdateData {
  sessionId: string;
  invoiceId: string | null;
  status: PaymentSessionStatus;
  paidAt?: Date;
}

interface ClinicUpdateData {
  clinicId: string;
  tier?: ClinicTier;
  intelligenceAddon?: string;
  subscriptionStatus?: SubscriptionStatus;
}

interface RateLimitTracker {
  messageCount: number;
  resetTime: number;
}

import { PrismaService } from '../prisma/prisma.service';
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
  private readonly RATE_LIMIT_MESSAGES = 10; // Max 10 messages
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // Per 60 seconds
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
      // Initialize rate limiter for this client
      this.rateLimitMap.set(client.id, {
        messageCount: 0,
        resetTime: Date.now() + this.RATE_LIMIT_WINDOW_MS,
      });
      this.logger.log(
        `Client connected and authenticated: ${client.id} (${payload.email})`,
      );
    } catch (err) {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // Clean up rate limit tracker
    this.rateLimitMap.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Check if client has exceeded rate limit
   * Returns true if message should be allowed, false if rate limited
   */
  private checkRateLimit(clientId: string): boolean {
    const tracker = this.rateLimitMap.get(clientId);
    if (!tracker) return true; // Allow if not tracked

    const now = Date.now();
    if (now > tracker.resetTime) {
      // Window expired, reset
      tracker.messageCount = 0;
      tracker.resetTime = now + this.RATE_LIMIT_WINDOW_MS;
    }

    if (tracker.messageCount >= this.RATE_LIMIT_MESSAGES) {
      return false; // Rate limited
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
    // Check rate limit
    if (!this.checkRateLimit(client.id)) {
      this.emitRateLimitError(client);
      return { event: 'error', data: { message: 'Rate limit exceeded' } };
    }

    const user = client.data.user;

    // Security check: Only allow users to subscribe to their own clinic's updates
    // except for SUPER_ADMIN users who can subscribe to any clinic.
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
    // Check rate limit
    if (!this.checkRateLimit(client.id)) {
      this.emitRateLimitError(client);
      return { event: 'error', data: { message: 'Rate limit exceeded' } };
    }

    const user = client.data.user;

    // Verify invoice belongs to the user's clinic
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

  // Emit clinic updates (tier changes, subscription status, etc.)
  emitClinicUpdate(clinicId: string, data: ClinicUpdateData) {
    this.server.to(`clinic:${clinicId}`).emit('clinic:update', data);
    this.logger.log(
      `Emitted clinic update for clinic ${clinicId}: ${JSON.stringify(data)}`,
    );
  }
}

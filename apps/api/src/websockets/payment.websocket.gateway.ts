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
  Role,
  SubscriptionStatus,
  InvoiceStatus as _InvoiceStatus,
  PaymentSessionStatus,
} from '@workspace/db';
import { BaseWebSocketGateway } from './base-websocket.gateway';

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
  subscriptionGraceUntil?: string | null;
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
  extends BaseWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  protected readonly logger = new Logger('PaymentGateway');
  protected readonly RATE_LIMIT_MESSAGES = 10;

  constructor(
    private readonly prisma: PrismaService,
    protected readonly jwtService: JwtService,
  ) {
    super();
  }

  async handleConnection(client: Socket) {
    await this.authenticateConnection(client, {
      noTokenWarning: 'Connection attempt without token',
      unauthorizedWarning: 'Unauthorized connection attempt',
      onAuthenticated: (authedClient, payload) => {
        this.logger.log(
          `Client connected and authenticated: ${authedClient.id} (${payload.email})`,
        );
      },
    });
  }

  @SubscribeMessage('subscribe:clinic')
  handleSubscribeClinic(client: Socket, clinicId: string) {
    const rateLimitError = this.rejectIfRateLimited(client);
    if (rateLimitError) return rateLimitError;

    const user = client.data.user;

    if (user.role !== Role.INTERNAL && user.clinicId !== clinicId) {
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
    const rateLimitError = this.rejectIfRateLimited(client);
    if (rateLimitError) return rateLimitError;

    const user = client.data.user;

    if (user.role !== Role.INTERNAL) {
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

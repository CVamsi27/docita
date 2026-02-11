import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
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
  subscriptionStatus?: SubscriptionStatus | string;
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
  server: Server;

  private logger = new Logger('PaymentGateway');

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
      this.logger.log(
        `Client connected and authenticated: ${client.id} (${payload.email})`,
      );
    } catch (err) {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:clinic')
  handleSubscribeClinic(client: Socket, clinicId: string) {
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

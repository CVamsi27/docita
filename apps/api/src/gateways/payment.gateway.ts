import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { getWebSocketCorsOrigins } from '../config/app-config';

interface PaymentUpdateData {
  sessionId: string;
  invoiceId: string | null;
  status: string;
  paidAt?: Date;
}

interface ClinicUpdateData {
  clinicId: string;
  tier?: string;
  intelligenceAddon?: string;
  subscriptionStatus?: string;
}

@WebSocketGateway({
  cors: {
    origin: getWebSocketCorsOrigins(),
    credentials: true,
  },
})
export class PaymentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('PaymentGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:clinic')
  handleSubscribeClinic(client: Socket, clinicId: string) {
    client.join(`clinic:${clinicId}`);
    this.logger.log(`Client ${client.id} subscribed to clinic:${clinicId}`);
    return { event: 'subscribed', data: { clinicId } };
  }

  @SubscribeMessage('subscribe:invoice')
  handleSubscribeInvoice(client: Socket, invoiceId: string) {
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

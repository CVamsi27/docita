import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentWebSocketGateway,
  ClinicUpdateData,
} from '@/gateways/payment.websocket.gateway';

@Injectable()
export class WebSocketEmissionService {
  private readonly logger = new Logger(WebSocketEmissionService.name);

  constructor(private readonly paymentGateway: PaymentWebSocketGateway) {}

  emitClinicUpdate(clinicId: string, data: ClinicUpdateData): void {
    try {
      this.paymentGateway.emitClinicUpdate(clinicId, data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit clinic update: ${errorMessage}`);
    }
  }
}

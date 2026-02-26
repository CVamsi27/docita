import { Injectable, Logger } from '@nestjs/common';
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';

export interface ClinicUpdateData {
  clinicId: string;
  tier?: string;
  intelligenceAddon?: string;
  subscriptionStatus?: string;
}

@Injectable()
export class WebSocketEmissionService {
  private readonly logger = new Logger(WebSocketEmissionService.name);

  constructor(private readonly paymentGateway: PaymentWebSocketGateway) {}

  emitClinicUpdate(clinicId: string, data: ClinicUpdateData): void {
    try {
      this.paymentGateway.emitClinicUpdate(clinicId, data as any);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit clinic update: ${errorMessage}`);
    }
  }
}

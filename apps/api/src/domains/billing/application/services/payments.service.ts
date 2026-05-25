import { Injectable } from '@nestjs/common';
import type { PaymentWebhookPayload } from '@workspace/types';
import { PaymentsCommandService } from './payments-command.service';
import { PaymentsQueryService } from './payments-query.service';

/**
 * Facade — preserves the public API for controllers, schedulers, and listeners.
 * Real logic lives in PaymentsCommandService / PaymentsQueryService.
 */
// AuditLogged: payment sessions, links, manual settlement, and Razorpay webhooks (PaymentsCommandService)
@Injectable()
export class PaymentsService {
  constructor(
    private readonly queryService: PaymentsQueryService,
    private readonly commandService: PaymentsCommandService,
  ) {}

  createPaymentSession(
    dto: Parameters<PaymentsCommandService['createPaymentSession']>[0],
  ) {
    return this.commandService.createPaymentSession(dto);
  }

  sendPaymentLinkWhatsApp(sessionId: string, clinicId: string) {
    return this.commandService.sendPaymentLinkWhatsApp(sessionId, clinicId);
  }

  createPaymentLink(
    dto: Parameters<PaymentsCommandService['createPaymentLink']>[0],
  ) {
    return this.commandService.createPaymentLink(dto);
  }

  verifySessionOwnership(sessionId: string, clinicId: string) {
    return this.queryService.verifySessionOwnership(sessionId, clinicId);
  }

  getPaymentSession(sessionId: string, clinicId: string) {
    return this.queryService.getPaymentSession(sessionId, clinicId);
  }

  markInvoicePaidManually(
    data: Parameters<PaymentsCommandService['markInvoicePaidManually']>[0],
  ) {
    return this.commandService.markInvoicePaidManually(data);
  }

  handleRazorpayWebhook(payload: PaymentWebhookPayload, signature: string) {
    return this.commandService.handleRazorpayWebhook(payload, signature);
  }
}

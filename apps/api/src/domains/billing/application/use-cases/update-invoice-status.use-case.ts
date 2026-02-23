/**
 * Update Invoice Status Use Case
 * Demonstrates state machine pattern through use case
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatusEnum } from '../../core/value-objects';
import { IInvoiceRepository } from '../ports/invoice.repository.port';

export interface UpdateInvoiceStatusCommand {
  invoiceId: string;
  targetStatus: InvoiceStatusEnum;
}

@Injectable()
export class UpdateInvoiceStatusUseCase {
  constructor(private invoiceRepository: IInvoiceRepository) {}

  async execute(command: UpdateInvoiceStatusCommand): Promise<void> {
    // 1. Fetch invoice
    const invoice = await this.invoiceRepository.findById(command.invoiceId);
    if (!invoice) {
      throw new NotFoundException(
        `Invoice ${command.invoiceId} not found`,
      );
    }

    // 2. Attempt state transition (entity validates this)
    const currentStatus = invoice.getStatus();
    if (!currentStatus.canTransitionTo(command.targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus.value} to ${command.targetStatus}`,
      );
    }

    // 3. Apply state change via entity method
    switch (command.targetStatus) {
      case InvoiceStatusEnum.ISSUED:
        invoice.issue();
        break;
      case InvoiceStatusEnum.SENT:
        invoice.send();
        break;
      case InvoiceStatusEnum.VIEWED:
        invoice.markAsViewed();
        break;
      case InvoiceStatusEnum.PAID:
        invoice.markAsPaid();
        break;
      case InvoiceStatusEnum.PARTIALLY_PAID:
        invoice.markAsPartiallyPaid();
        break;
      case InvoiceStatusEnum.OVERDUE:
        invoice.markAsOverdue();
        break;
      case InvoiceStatusEnum.CANCELLED:
        invoice.cancel();
        break;
      case InvoiceStatusEnum.CREDIT_MEMO:
        invoice.convertToCredit();
        break;
      default:
        throw new BadRequestException(`Invalid status: ${command.targetStatus}`);
    }

    // 4. Persist updated invoice
    await this.invoiceRepository.update(invoice);
  }
}

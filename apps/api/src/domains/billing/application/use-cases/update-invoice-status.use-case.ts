import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatusEnum } from '@/domains/billing/core/value-objects';
import { IInvoiceRepository } from '@/domains/billing/application/ports/invoice.repository.port';

export interface UpdateInvoiceStatusCommand {
  invoiceId: string;
  targetStatus: InvoiceStatusEnum;
}

@Injectable()
export class UpdateInvoiceStatusUseCase {
  constructor(private invoiceRepository: IInvoiceRepository) {}

  async execute(command: UpdateInvoiceStatusCommand): Promise<void> {
    const invoice = await this.invoiceRepository.findById(command.invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${command.invoiceId} not found`);
    }

    const currentStatus = invoice.getStatus();
    if (!currentStatus.canTransitionTo(command.targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus.value} to ${command.targetStatus}`,
      );
    }

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
        throw new BadRequestException(
          `Invalid status: ${command.targetStatus}`,
        );
    }

    await this.invoiceRepository.update(invoice);
  }
}

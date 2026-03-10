import { Injectable, BadRequestException } from '@nestjs/common';
import { Invoice, InvoiceItem } from '@/domains/billing/core/entities';
import {
  Money,
  InvoiceStatus,
  InvoiceStatusEnum,
  BillingPeriod,
} from '@/domains/billing/core/value-objects';
import {
  BillingCalculatorService,
  InvoiceValidatorService,
} from '@/domains/billing/core/services';
import { CreateInvoiceDto } from '@/domains/billing/application/dto/invoice.dto';
import { IInvoiceRepository } from '@/domains/billing/application/ports/invoice.repository.port';
import { DEFAULT_CURRENCY } from '@workspace/utils';

export class CreateInvoiceCommand {
  constructor(readonly createInvoiceDto: CreateInvoiceDto) {}
}

@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    private invoiceRepository: IInvoiceRepository,
    private billingCalculator: BillingCalculatorService,
    private invoiceValidator: InvoiceValidatorService,
  ) {}

  async execute(dto: CreateInvoiceDto): Promise<{ invoiceId: string }> {
    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const items = dto.items.map(
      (item, index) =>
        new InvoiceItem({
          id: `item_${invoiceId}_${index}`,
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: new Money(item.unitPrice, DEFAULT_CURRENCY),
          taxRate: item.taxRate,
          discount: item.discount ?? 0,
        }),
    );

    const itemErrors = items.flatMap((item, idx) =>
      this.invoiceValidator
        .validateInvoiceItem(item)
        .map((e) => `Item ${idx + 1}: ${e}`),
    );

    if (itemErrors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid invoice items',
        errors: itemErrors,
      });
    }

    const billingPeriod = new BillingPeriod(dto.issueDate, dto.dueDate);
    const status = new InvoiceStatus(InvoiceStatusEnum.DRAFT);

    const invoice = new Invoice({
      id: invoiceId,
      clinicId: dto.clinicId,
      patientId: dto.patientId,
      status,
      billingPeriod,
      items,
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: dto.notes,
    });

    const validation = this.invoiceValidator.validateInvoice(invoice);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid invoice',
        errors: validation.errors,
      });
    }

    await this.invoiceRepository.save(invoice);

    return { invoiceId: invoice.id };
  }
}

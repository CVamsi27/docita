/**
 * Create Invoice Use Case
 * Orchestrates invoice creation with validation and persistence
 * 
 * Flow:
 * 1. Convert DTO to domain items (Money value objects)
 * 2. Validate individual items
 * 3. Create Invoice aggregate root
 * 4. Validate complete invoice
 * 5. Persist via repository
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { Invoice, InvoiceItem } from '../../core/entities';
import { Money, InvoiceStatus, InvoiceStatusEnum, BillingPeriod } from '../../core/value-objects';
import { BillingCalculatorService, InvoiceValidatorService } from '../../core/services';
import { CreateInvoiceDto } from '../dto/invoice.dto';
import { IInvoiceRepository } from '../ports/invoice.repository.port';

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

    // 1. Create domain items with Money value objects
    const items = dto.items.map((item, index) =>
      new InvoiceItem({
        id: `item_${invoiceId}_${index}`,
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: new Money(item.unitPrice, 'INR'),
        taxRate: item.taxRate,
        discount: item.discount ?? 0,
      }),
    );

    // 2. Validate all items
    const itemErrors = items
      .flatMap((item, idx) =>
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

    // 3. Create invoice entity (aggregate root)
    const billingPeriod = new BillingPeriod(dto.issueDate, dto.dueDate);
    const status = new InvoiceStatus(InvoiceStatusEnum.DRAFT);

    const invoice = new Invoice({
      id: invoiceId,
      clinicId: dto.clinicId,
      patientId: dto.patientId,
      status,
      billingPeriod,
      items,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: dto.notes,
    });

    // 4. Validate complete invoice
    const validation = this.invoiceValidator.validateInvoice(invoice);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid invoice',
        errors: validation.errors,
      });
    }

    // 5. Persist via repository (port)
    await this.invoiceRepository.save(invoice);

    return { invoiceId: invoice.id };
  }
}

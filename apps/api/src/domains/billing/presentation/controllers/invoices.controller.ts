/**
 * Invoices Controller
 * Presentation layer - handles HTTP requests and responses
 * Delegates to use cases for business logic
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateInvoiceUseCase } from '../../application/use-cases/create-invoice.use-case';
import { CalculateInvoiceTotalUseCase } from '../../application/use-cases/calculate-invoice-total.use-case';
import { UpdateInvoiceStatusUseCase } from '../../application/use-cases/update-invoice-status.use-case';
import {
  CreateInvoiceDtoSchema,
  InvoiceResponseDtoSchema,
  type CreateInvoiceDto,
} from '../../application/dto/invoice.dto';
import { InvoiceStatusEnum } from '../../core/value-objects';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private createInvoiceUseCase: CreateInvoiceUseCase,
    private calculateTotalUseCase: CalculateInvoiceTotalUseCase,
    private updateStatusUseCase: UpdateInvoiceStatusUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateInvoiceDto) {
    // Validate using Zod schema
    const validated = CreateInvoiceDtoSchema.safeParse(dto);
    if (!validated.success) {
      throw new BadRequestException({
        message: 'Invalid invoice data',
        errors: validated.error.errors,
      });
    }

    // Delegate to use case
    const result = await this.createInvoiceUseCase.execute(validated.data);
    return result;
  }

  @Get(':id')
  getInvoice(@Param('id') id: string) {
    // This would use GetInvoiceUseCase in a real app
    return {
      message: 'Get invoice - not implemented in example',
      invoiceId: id,
    };
  }

  @Get(':id/total')
  async getTotal(@Param('id') id: string) {
    try {
      const result = await this.calculateTotalUseCase.execute(id);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: InvoiceStatusEnum,
  ) {
    if (!Object.values(InvoiceStatusEnum).includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    try {
      await this.updateStatusUseCase.execute({
        invoiceId: id,
        targetStatus: status,
      });
      return { message: `Invoice status updated to ${status}` };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    // This would use a DeleteInvoiceUseCase in a real app
    return {
      message: 'Delete invoice - not implemented in example',
      invoiceId: id,
    };
  }
}

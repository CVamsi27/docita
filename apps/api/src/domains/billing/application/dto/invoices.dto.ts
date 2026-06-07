// jscpd:ignore-start
import { createZodDto } from 'nestjs-zod';
import {
  createInvoiceRequestSchema,
  invoiceResponseSchema,
  invoicePaymentActivityResponseSchema,
  listInvoicesQuerySchema,
  paginatedInvoiceListResponseSchema,
  updateInvoiceRequestSchema,
} from '@workspace/types';
import { InvoiceStatus as _InvoiceStatus } from '@workspace/db';
import { doctorFieldsSchema } from './doctor-fields.shared';

export const CreateInvoiceSchema = createInvoiceRequestSchema
  .omit({
    clinicId: true,
    paymentMethod: true,
    paidAt: true,
    totalAmount: true,
  })
  .merge(doctorFieldsSchema);

export class CreateInvoiceDto extends createZodDto(CreateInvoiceSchema) {}

export const UpdateInvoiceSchema =
  updateInvoiceRequestSchema.merge(doctorFieldsSchema);
// jscpd:ignore-end

export class UpdateInvoiceDto extends createZodDto(UpdateInvoiceSchema) {}

export const ListInvoicesQuerySchema = listInvoicesQuerySchema;
export class ListInvoicesQueryDto extends createZodDto(
  ListInvoicesQuerySchema,
) {}

export class InvoiceResponseDto extends createZodDto(invoiceResponseSchema) {}

export class PaginatedInvoiceResponseDto extends createZodDto(
  paginatedInvoiceListResponseSchema,
) {}

export class InvoicePaymentActivityResponseDto extends createZodDto(
  invoicePaymentActivityResponseSchema,
) {}

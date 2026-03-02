import { createZodDto } from 'nestjs-zod';
import {
  createPaymentLinkRequestSchema,
  paymentLinkContractResponseSchema,
  paymentSessionContractResponseSchema,
  markInvoicePaidRequestSchema,
  jsonObjectSchema,
} from '@workspace/types';

export class CreatePaymentLinkDto extends createZodDto(
  createPaymentLinkRequestSchema,
) {}
export class PaymentLinkResponseDto extends createZodDto(
  paymentLinkContractResponseSchema,
) {}
export class PaymentSessionResponseDto extends createZodDto(
  paymentSessionContractResponseSchema,
) {}

export const MarkInvoicePaidSchema = markInvoicePaidRequestSchema;

export class MarkInvoicePaidDto extends createZodDto(MarkInvoicePaidSchema) {}

export class AnyResponseDto extends createZodDto(jsonObjectSchema) {}

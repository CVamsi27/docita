import { createZodDto } from 'nestjs-zod';
import {
  createPaymentLinkRequestSchema,
  paymentLinkContractResponseSchema,
  paymentSessionContractResponseSchema,
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

export class AnyResponseDto extends createZodDto(jsonObjectSchema) {}

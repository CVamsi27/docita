import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  createPaymentLinkSchema,
  paymentLinkResponseSchema,
  paymentSessionSchema,
} from '@workspace/types';

export class CreatePaymentLinkDto extends createZodDto(
  createPaymentLinkSchema,
) {}
export class PaymentLinkResponseDto extends createZodDto(
  paymentLinkResponseSchema,
) {}
export class PaymentSessionResponseDto extends createZodDto(
  paymentSessionSchema,
) {}

export class AnyResponseDto extends createZodDto(z.any()) {}

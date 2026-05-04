import { createZodDto } from 'nestjs-zod';
import { deskRecordInvoiceSettlementBodySchema } from '@workspace/types';

export class DeskRecordInvoiceSettlementBodyDto extends createZodDto(
  deskRecordInvoiceSettlementBodySchema,
) {}

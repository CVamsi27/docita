import { createZodDto } from 'nestjs-zod';
import {
  deskOpenInvoicesResponseSchema,
  deskRecordInvoiceSettlementBodySchema,
  listDeskOpenInvoicesQuerySchema,
} from '@workspace/types';

export class ListDeskOpenInvoicesQueryDto extends createZodDto(
  listDeskOpenInvoicesQuerySchema,
) {}

export class DeskOpenInvoicesResponseDto extends createZodDto(
  deskOpenInvoicesResponseSchema,
) {}

export class DeskRecordInvoiceSettlementBodyDto extends createZodDto(
  deskRecordInvoiceSettlementBodySchema,
) {}

import { Injectable, Logger, Inject } from '@nestjs/common';
import { JobNames } from '@/shared/modules/queue/queue.interface';
import {
  PDF_JOB_PROCESSOR_PRISMA_TOKEN,
  type PdfJobProcessorPrismaPort,
} from '@/shared/modules/queue/pdf-job.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { InvoicesService } from './invoices.service';
import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';
import {
  BasePdfProcessor,
  BasePdfServicePort,
} from '@/shared/modules/queue/base-pdf.processor';
import type { IQueueProvider } from '@/shared/modules/queue/queue.interface';

export type InvoicePdfProcessorPort = Pick<
  InvoicesService,
  'findOne' | 'generatePDF' | 'uploadAndPersist'
>;

@Injectable()
export class InvoicePdfProcessor extends BasePdfProcessor<InvoiceDetail> {
  protected readonly logger = new Logger(InvoicePdfProcessor.name);
  protected readonly jobName = JobNames.GENERATE_INVOICE_PDF;
  protected readonly entityLabel = 'Invoice';

  constructor(
    @Inject(PDF_JOB_PROCESSOR_PRISMA_TOKEN)
    persistence: PdfJobProcessorPrismaPort,
    @Inject(InvoicesService)
    service: InvoicePdfProcessorPort & BasePdfServicePort<InvoiceDetail>,
    @Inject('queue') queue: Pick<IQueueProvider, 'process'>,
    @Inject(CLOCK_PORT) clock: IClock,
  ) {
    super(service, persistence, queue, clock);
  }
}

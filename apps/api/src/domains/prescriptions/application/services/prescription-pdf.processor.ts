import { Injectable, Logger, Inject } from '@nestjs/common';
import { JobNames } from '@/shared/modules/queue/queue.interface';
import {
  PDF_JOB_PROCESSOR_PRISMA_TOKEN,
  type PdfJobProcessorPrismaPort,
} from '@/shared/modules/queue/pdf-job.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrescriptionsService } from './prescription.service';
import {
  BasePdfProcessor,
  BasePdfServicePort,
} from '@/shared/modules/queue/base-pdf.processor';
import type { IQueueProvider } from '@/shared/modules/queue/queue.interface';

export type PrescriptionPdfProcessorPort = Pick<
  PrescriptionsService,
  'findOne' | 'generatePDF' | 'uploadAndPersist'
>;

@Injectable()
export class PrescriptionPdfProcessor extends BasePdfProcessor {
  protected readonly logger = new Logger(PrescriptionPdfProcessor.name);
  protected readonly jobName = JobNames.GENERATE_PRESCRIPTION_PDF;
  protected readonly entityLabel = 'Prescription';

  constructor(
    @Inject(PDF_JOB_PROCESSOR_PRISMA_TOKEN)
    persistence: PdfJobProcessorPrismaPort,
    @Inject(PrescriptionsService)
    service: PrescriptionPdfProcessorPort & BasePdfServicePort,
    @Inject('queue') queue: Pick<IQueueProvider, 'process'>,
    @Inject(CLOCK_PORT) clock: IClock,
  ) {
    super(service, persistence, queue, clock);
  }
}

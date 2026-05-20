import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import {
  IQueueProvider,
  JobNames,
  GeneratePdfJobData,
} from '@/shared/modules/queue/queue.interface';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { InvoicesService } from './invoices.service';
import {
  PDF_JOB_PROCESSOR_PRISMA_TOKEN,
  type PdfJobProcessorPrismaPort,
} from '@/shared/modules/queue/pdf-job.service';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

const PDF_SIGNED_URL_TTL_SECONDS = 3600;

function areSchedulersEnabled(): boolean {
  return process.env.ENABLE_SCHEDULERS !== 'false';
}

export type InvoicePdfProcessorPort = Pick<
  InvoicesService,
  'findOne' | 'generatePDF' | 'uploadAndPersist'
>;

@Injectable()
export class InvoicePdfProcessor implements OnModuleInit {
  private readonly logger = new Logger(InvoicePdfProcessor.name);

  constructor(
    @Inject(PDF_JOB_PROCESSOR_PRISMA_TOKEN)
    private readonly persistence: PdfJobProcessorPrismaPort,
    @Inject(InvoicesService)
    private readonly invoicesService: InvoicePdfProcessorPort,
    private readonly storageProvider: StorageProvider,
    @Inject('queue') private readonly queue: Pick<IQueueProvider, 'process'>,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  onModuleInit() {
    if (
      !areSchedulersEnabled() ||
      (process.env.QUEUE_BACKEND === 'postgres' &&
        process.env.WORKER_ENTRYPOINT !== 'worker')
    ) {
      return;
    }

    void this.queue.process<GeneratePdfJobData>(
      JobNames.GENERATE_INVOICE_PDF,
      async (job) => {
        const { documentId, clinicId, pdfJobId } = job.data;

        if (pdfJobId) {
          await this.persistence.runUnrestricted(async () =>
            this.persistence.pdfJob.update({
              where: { id: pdfJobId },
              data: { status: 'PROCESSING' },
            }),
          );
        }

        try {
          const invoice = await this.invoicesService.findOne(
            documentId,
            clinicId,
          );
          const buffer = await this.invoicesService.generatePDF(
            documentId,
            clinicId,
          );
          const { storedKey } = await this.invoicesService.uploadAndPersist(
            documentId,
            clinicId,
            buffer,
            invoice,
          );

          if (pdfJobId) {
            const pdfUrl = await this.storageProvider.generateSignedUrl(
              storedKey,
              PDF_SIGNED_URL_TTL_SECONDS,
            );

            await this.persistence.runUnrestricted(async () =>
              this.persistence.pdfJob.update({
                where: { id: pdfJobId },
                data: {
                  status: 'COMPLETED',
                  pdfUrl,
                  completedAt: this.clock.now(),
                },
              }),
            );
          }
        } catch (error) {
          this.logger.error(
            `Invoice PDF generation failed for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
          );

          const isFinalAttempt = job.attemptsMade + 1 >= (job.maxAttempts ?? 1);

          if (pdfJobId && isFinalAttempt) {
            await this.persistence.runUnrestricted(async () =>
              this.persistence.pdfJob.update({
                where: { id: pdfJobId },
                data: {
                  status: 'FAILED',
                  failedReason:
                    error instanceof Error ? error.message : String(error),
                },
              }),
            );
          }

          throw error;
        }
      },
    );
  }
}

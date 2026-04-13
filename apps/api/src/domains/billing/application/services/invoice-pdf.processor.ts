import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IQueueProvider,
  JobNames,
  GeneratePdfJobData,
} from '@/shared/modules/queue/queue.interface';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { InvoicesService } from './invoices.service';
import type { PdfJobProcessorPrismaPort } from '@/shared/modules/queue/pdf-job.service';

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
    @Inject(PrismaService)
    private readonly prisma: PdfJobProcessorPrismaPort,
    @Inject(InvoicesService)
    private readonly invoicesService: InvoicePdfProcessorPort,
    private readonly storageProvider: StorageProvider,
    @Inject('queue') private readonly queue: Pick<IQueueProvider, 'process'>,
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
          await this.prisma.runUnrestricted(async () =>
            this.prisma.pdfJob.update({
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

            await this.prisma.runUnrestricted(async () =>
              this.prisma.pdfJob.update({
                where: { id: pdfJobId },
                data: { status: 'COMPLETED', pdfUrl, completedAt: new Date() },
              }),
            );
          }
        } catch (error) {
          this.logger.error(
            `Invoice PDF generation failed for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
          );

          const isFinalAttempt = job.attemptsMade + 1 >= (job.maxAttempts ?? 1);

          if (pdfJobId && isFinalAttempt) {
            await this.prisma.runUnrestricted(async () =>
              this.prisma.pdfJob.update({
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

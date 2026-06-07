import { Logger, OnModuleInit } from '@nestjs/common';
import {
  IQueueProvider,
  JobNames,
  GeneratePdfJobData,
} from '@/shared/modules/queue/queue.interface';
import { type PdfJobProcessorPrismaPort } from '@/shared/modules/queue/pdf-job.service';
import { type IClock } from '@/shared/common/ports/clock.port';
import { shouldRegisterPdfQueueHandlers } from '@/shared/modules/queue/pdf-processor-registration';

export interface BasePdfServicePort {
  findOne(documentId: string, clinicId: string): Promise<unknown>;
  generatePDF(documentId: string, clinicId: string): Promise<Buffer>;
  uploadAndPersist(
    documentId: string,
    clinicId: string,
    buffer: Buffer,
    document: unknown,
  ): Promise<{ storedKey: string }>;
}

export abstract class BasePdfProcessor implements OnModuleInit {
  protected abstract readonly logger: Logger;
  protected abstract readonly jobName: JobNames;
  protected abstract readonly entityLabel: string;

  constructor(
    protected readonly service: BasePdfServicePort,
    protected readonly persistence: PdfJobProcessorPrismaPort,
    protected readonly queue: Pick<IQueueProvider, 'process'>,
    protected readonly clock: IClock,
  ) {}

  onModuleInit() {
    if (!shouldRegisterPdfQueueHandlers()) {
      return;
    }

    void this.queue.process<GeneratePdfJobData>(this.jobName, async (job) => {
      const { documentId, clinicId, pdfJobId } = job.data;

      if (pdfJobId) {
        // RLS-BYPASS: pdf job status update runs in queue worker outside tenant context
        await this.persistence.runUnrestricted(async () =>
          this.persistence.pdfJob.update({
            where: { id: pdfJobId },
            data: { status: 'PROCESSING' },
          }),
        );
      }

      try {
        const document = await this.service.findOne(documentId, clinicId);
        const buffer = await this.service.generatePDF(documentId, clinicId);
        const { storedKey } = await this.service.uploadAndPersist(
          documentId,
          clinicId,
          buffer,
          document,
        );

        if (pdfJobId) {
          // RLS-BYPASS: pdf job status update runs in queue worker outside tenant context
          await this.persistence.runUnrestricted(async () =>
            this.persistence.pdfJob.update({
              where: { id: pdfJobId },
              data: {
                status: 'COMPLETED',
                pdfUrl: storedKey,
                completedAt: this.clock.now(),
              },
            }),
          );
        }
      } catch (error) {
        this.logger.error(
          `${this.entityLabel} PDF generation failed for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        );

        const isFinalAttempt = job.attemptsMade + 1 >= (job.maxAttempts ?? 1);

        if (pdfJobId && isFinalAttempt) {
          // RLS-BYPASS: pdf job status update runs in queue worker outside tenant context
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
    });
  }
}

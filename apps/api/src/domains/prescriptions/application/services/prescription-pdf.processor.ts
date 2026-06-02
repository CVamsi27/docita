import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import {
  IQueueProvider,
  JobNames,
  GeneratePdfJobData,
} from '@/shared/modules/queue/queue.interface';
import { PrescriptionsService } from './prescription.service';
import {
  PDF_JOB_PROCESSOR_PRISMA_TOKEN,
  type PdfJobProcessorPrismaPort,
} from '@/shared/modules/queue/pdf-job.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

import { shouldRegisterPdfQueueHandlers } from '@/shared/modules/queue/pdf-processor-registration';

export type PrescriptionPdfProcessorPort = Pick<
  PrescriptionsService,
  'findOne' | 'generatePDF' | 'uploadAndPersist'
>;

@Injectable()
export class PrescriptionPdfProcessor implements OnModuleInit {
  private readonly logger = new Logger(PrescriptionPdfProcessor.name);

  constructor(
    @Inject(PDF_JOB_PROCESSOR_PRISMA_TOKEN)
    private readonly persistence: PdfJobProcessorPrismaPort,
    @Inject(PrescriptionsService)
    private readonly prescriptionsService: PrescriptionPdfProcessorPort,
    @Inject('queue') private readonly queue: Pick<IQueueProvider, 'process'>,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  onModuleInit() {
    if (!shouldRegisterPdfQueueHandlers()) {
      return;
    }

    void this.queue.process<GeneratePdfJobData>(
      JobNames.GENERATE_PRESCRIPTION_PDF,
      async (job) => {
        const { documentId, clinicId, pdfJobId } = job.data;

        if (pdfJobId) {
          // RLS-BYPASS: prescription PDF worker processes jobs without request tenant context
          await this.persistence.runUnrestricted(async () =>
            this.persistence.pdfJob.update({
              where: { id: pdfJobId },
              data: { status: 'PROCESSING' },
            }),
          );
        }

        try {
          const prescription = await this.prescriptionsService.findOne(
            documentId,
            clinicId,
          );
          const buffer = await this.prescriptionsService.generatePDF(
            documentId,
            clinicId,
          );
          const { storedKey } =
            await this.prescriptionsService.uploadAndPersist(
              documentId,
              clinicId,
              buffer,
              prescription,
            );

          if (pdfJobId) {
            // RLS-BYPASS: prescription PDF worker processes jobs without request tenant context
            await this.persistence.runUnrestricted(async () =>
              this.persistence.pdfJob.update({
                where: { id: pdfJobId },
                data: {
                  status: 'COMPLETED',
                  // Historical column name; completed jobs persist the object key
                  // and mint a fresh signed URL when status is read.
                  pdfUrl: storedKey,
                  completedAt: this.clock.now(),
                },
              }),
            );
          }
        } catch (error) {
          this.logger.error(
            `Prescription PDF generation failed for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
          );

          const isFinalAttempt = job.attemptsMade + 1 >= (job.maxAttempts ?? 1);

          if (pdfJobId && isFinalAttempt) {
            // RLS-BYPASS: prescription PDF worker processes jobs without request tenant context
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

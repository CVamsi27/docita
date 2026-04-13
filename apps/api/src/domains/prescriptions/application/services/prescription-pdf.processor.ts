import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IQueueProvider,
  JobNames,
  GeneratePdfJobData,
} from '@/shared/modules/queue/queue.interface';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { PrescriptionsService } from './prescription.service';
import type { PdfJobProcessorPrismaPort } from '@/shared/modules/queue/pdf-job.service';

const PDF_SIGNED_URL_TTL_SECONDS = 3600;

export type PrescriptionPdfProcessorPort = Pick<
  PrescriptionsService,
  'findOne' | 'generatePDF' | 'uploadAndPersist'
>;

@Injectable()
export class PrescriptionPdfProcessor implements OnModuleInit {
  private readonly logger = new Logger(PrescriptionPdfProcessor.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PdfJobProcessorPrismaPort,
    @Inject(PrescriptionsService)
    private readonly prescriptionsService: PrescriptionPdfProcessorPort,
    private readonly storageProvider: StorageProvider,
    @Inject('queue') private readonly queue: Pick<IQueueProvider, 'process'>,
  ) {}

  onModuleInit() {
    if (
      process.env.QUEUE_BACKEND === 'postgres' &&
      process.env.WORKER_ENTRYPOINT !== 'worker'
    ) {
      return;
    }

    void this.queue.process<GeneratePdfJobData>(
      JobNames.GENERATE_PRESCRIPTION_PDF,
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
              buffer,
              prescription,
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
            `Prescription PDF generation failed for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
          );

          if (pdfJobId) {
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

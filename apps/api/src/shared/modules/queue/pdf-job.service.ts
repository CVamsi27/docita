import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IQueueProvider, JobNames } from './queue.interface';
import {
  EnqueuePdfJobResponse,
  PdfJobStatusResponse,
  pdfJobStatusSchema,
} from '@workspace/types';

type PdfJobRecord = {
  id: string;
  status: string;
  pdfUrl: string | null;
  createdAt: Date;
};

export interface PdfJobPrismaPort {
  runUnrestricted<T>(fn: () => Promise<T>): Promise<T>;
  pdfJob: {
    create(args: {
      data: {
        documentId: string;
        documentType: 'invoice' | 'prescription';
        clinicId: string;
      };
      select: {
        id: true;
        status: true;
        pdfUrl: true;
        createdAt: true;
      };
    }): Promise<PdfJobRecord>;
    findFirst(args: {
      where: {
        id?: string;
        clinicId?: string;
        documentId?: string;
        documentType?: 'invoice' | 'prescription';
      };
    }): Promise<PdfJobRecord | null>;
  };
}

export interface PdfJobProcessorPrismaPort {
  runUnrestricted<T>(fn: () => Promise<T>): Promise<T>;
  pdfJob: {
    update(args: {
      where: { id: string };
      data: {
        status?: string;
        pdfUrl?: string | null;
        failedReason?: string | null;
        completedAt?: Date | null;
      };
    }): Promise<void>;
  };
}

export const PDF_JOB_PROCESSOR_PRISMA_TOKEN = 'PdfJobProcessorPrismaPort';

export interface PdfJobServicePort {
  enqueue(
    documentId: string,
    documentType: 'invoice' | 'prescription',
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse>;
  getStatus(jobId: string, clinicId: string): Promise<PdfJobStatusResponse>;
}

@Injectable()
export class PdfJobService implements PdfJobServicePort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PdfJobPrismaPort,
    @Inject('queue') private readonly queue: Pick<IQueueProvider, 'enqueue'>,
  ) {}

  async enqueue(
    documentId: string,
    documentType: 'invoice' | 'prescription',
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse> {
    let shouldEnqueue = true;
    const pdfJob = await this.prisma.runUnrestricted(async () => {
      try {
        return await this.prisma.pdfJob.create({
          data: { documentId, documentType, clinicId },
          select: {
            id: true,
            status: true,
            pdfUrl: true,
            createdAt: true,
          },
        });
      } catch (error: unknown) {
        if (!this.isUniqueConstraintViolation(error)) {
          throw error;
        }

        shouldEnqueue = false;
        const existing = await this.prisma.pdfJob.findFirst({
          where: { clinicId, documentId, documentType },
        });

        if (!existing) {
          throw error;
        }

        return existing;
      }
    });

    const jobName =
      documentType === 'invoice'
        ? JobNames.GENERATE_INVOICE_PDF
        : JobNames.GENERATE_PRESCRIPTION_PDF;

    if (shouldEnqueue) {
      await this.queue.enqueue(jobName, {
        documentId,
        documentType,
        clinicId,
        pdfJobId: pdfJob.id,
      });
    }

    return {
      jobId: pdfJob.id,
      status: pdfJobStatusSchema.parse(pdfJob.status),
      pollUrl: `/api/v1/${documentType === 'invoice' ? 'invoices' : 'prescriptions'}/${documentId}/pdf/status?jobId=${pdfJob.id}`,
    };
  }

  async getStatus(
    jobId: string,
    clinicId: string,
  ): Promise<PdfJobStatusResponse> {
    const pdfJob = await this.prisma.runUnrestricted(async () =>
      this.prisma.pdfJob.findFirst({
        where: { id: jobId, clinicId },
      }),
    );

    if (!pdfJob) {
      throw new NotFoundException(`PDF job ${jobId} not found`);
    }

    return {
      jobId: pdfJob.id,
      status: pdfJobStatusSchema.parse(pdfJob.status),
      pdfUrl: pdfJob.pdfUrl ?? undefined,
      createdAt: pdfJob.createdAt,
    };
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}

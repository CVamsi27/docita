import { Injectable } from '@nestjs/common';
import { PrescriptionDetail } from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import { type EnqueuePdfJobResponse } from '@workspace/types';
import { DEFAULT_LOCALE } from '@workspace/utils';
import { PrescriptionsCommandService } from './prescriptions-command.service';
import { PrescriptionsQueryService } from './prescriptions-query.service';
import type { CreatePrescriptionParams } from './prescription-create.type';

/**
 * Facade — delegates prescription reads and mutations to query/command services.
 */
@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly queryService: PrescriptionsQueryService,
    private readonly commandService: PrescriptionsCommandService,
  ) {}

  findAll(
    clinicId: string,
    params?: {
      search?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      patientId?: string;
      limit?: number;
    },
  ) {
    return this.queryService.findAll(clinicId, params);
  }

  findOne(id: string, clinicId: string): Promise<PrescriptionDetail> {
    return this.queryService.findOne(id, clinicId);
  }

  create(data: CreatePrescriptionParams) {
    return this.commandService.create(data);
  }

  generatePDF(
    id: string,
    clinicIdOrTimezone: string,
    locale: string = DEFAULT_LOCALE,
  ): Promise<Buffer> {
    return this.commandService.generatePDF(id, clinicIdOrTimezone, locale);
  }

  getPdf(
    id: string,
    clinicId: string,
  ): Promise<
    { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer }
  > {
    return this.queryService.getPdf(id, clinicId);
  }

  generatePdfAsync(
    id: string,
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse> {
    return this.commandService.generatePdfAsync(id, clinicId);
  }

  uploadAndPersist(
    id: string,
    clinicId: string,
    buffer: Buffer,
    prescription: PrescriptionDetail,
  ): Promise<{ storedKey: string; generatedAt: Date }> {
    return this.commandService.uploadAndPersist(
      id,
      clinicId,
      buffer,
      prescription,
    );
  }
}

// jscpd:ignore-start
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  IPrescriptionRepository,
  PrescriptionDetail,
} from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import { PrescriptionPdfOrchestratorService } from './prescription-pdf-orchestrator.service';

@Injectable()
export class PrescriptionsQueryService {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly repository: IPrescriptionRepository,
    private readonly pdfOrchestrator: PrescriptionPdfOrchestratorService,
  ) {}

  async findAll(
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
    return this.repository.findAll({
      // jscpd:ignore-end
      clinicId,
      ...params,
    });
  }

  async findOne(id: string, clinicId: string): Promise<PrescriptionDetail> {
    const prescription = await this.repository.findById(id, clinicId);

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    return prescription;
  }

  async getPdf(
    id: string,
    clinicId: string,
  ): Promise<
    { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer }
  > {
    return this.pdfOrchestrator.getPdf(id, clinicId);
  }
}

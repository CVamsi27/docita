import { Injectable } from '@nestjs/common';
import { PrescriptionDetail } from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import {
  Specialization,
  HospitalRole,
  type EnqueuePdfJobResponse,
} from '@workspace/types';
import { DEFAULT_LOCALE } from '@workspace/utils';
import { PrescriptionsCommandService } from './prescriptions-command.service';
import { PrescriptionsQueryService } from './prescriptions-query.service';

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

  create(data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    instructions?: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      route?: string;
      ndcCode?: string;
      rxNormCui?: string;
      dosageForm?: string;
      strengthValue?: number;
      strengthUnit?: string;
      sigCode?: string;
      quantity?: number;
      refillsAllowed?: number;
      dispenseAsWritten?: boolean;
      startDate?: string | Date;
      endDate?: string | Date;
      isPRN?: boolean;
      prnInstructions?: string;
      prnMaxDose?: string;
      specialInstructions?: string;
      indication?: string;
    }>;
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialization?: Specialization;
    doctorRole?: HospitalRole;
    doctorRegistrationNumber?: string;
    doctorLicenseNumber?: string;
    clinicId?: string;
  }) {
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

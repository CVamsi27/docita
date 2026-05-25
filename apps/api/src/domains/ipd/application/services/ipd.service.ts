import { Inject, Injectable } from '@nestjs/common';
import {
  AdmitPatientRequest,
  DischargePatientRequest,
  TransferPatientRequest,
} from '@workspace/types';
import {
  IPD_REPOSITORY_TOKEN,
  IpdRepository,
} from '@/domains/ipd/core/repositories/ipd.repository.interface';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';

/**
 * Thin facade — delegates IPD ward/admission operations to IpdRepository.
 */
@Injectable()
export class IpdService {
  constructor(
    @Inject(IPD_REPOSITORY_TOKEN)
    private readonly repository: IpdRepository,
    private readonly auditService: AuditService,
  ) {}

  listWards(clinicId: string, search?: string) {
    return this.repository.listWards(clinicId, search);
  }

  listAdmissions(clinicId: string, status?: string) {
    return this.repository.listAdmissions(clinicId, status);
  }

  async admitPatient(
    clinicId: string,
    input: AdmitPatientRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    const admission = await this.repository.admitPatient(clinicId, input);

    await this.auditService.logAction({
      clinicId,
      userId: actorUserId,
      actionType: 'IPD_ADMISSION_CREATED',
      resourceType: 'Admission',
      resourceId: admission.id,
      ipAddress,
      metadata: {
        patientId: input.patientId,
        bedId: input.bedId,
        admittingDoctorId: input.admittingDoctorId,
      },
    });

    return admission;
  }

  async transferPatient(
    clinicId: string,
    input: TransferPatientRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    const admission = await this.repository.transferPatient(clinicId, input);

    await this.auditService.logAction({
      clinicId,
      userId: actorUserId,
      actionType: 'IPD_ADMISSION_TRANSFERRED',
      resourceType: 'Admission',
      resourceId: admission.id,
      ipAddress,
      metadata: {
        toBedId: input.toBedId,
      },
    });

    return admission;
  }

  async dischargePatient(
    clinicId: string,
    input: DischargePatientRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    const admission = await this.repository.dischargePatient(clinicId, input);

    await this.auditService.logAction({
      clinicId,
      userId: actorUserId,
      actionType: 'IPD_ADMISSION_DISCHARGED',
      resourceType: 'Admission',
      resourceId: admission.id,
      ipAddress,
      metadata: {
        bedId: admission.bedId,
        patientId: admission.patientId,
      },
    });

    return admission;
  }
}

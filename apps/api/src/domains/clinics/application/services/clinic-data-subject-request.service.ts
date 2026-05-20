import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { DataSubjectRequestStatus } from '@workspace/db';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import type {
  CreateDataSubjectRequest,
  UpdateDataSubjectRequest,
} from '@workspace/types';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

/**
 * Handles GDPR / data-subject request lifecycle: creation and status updates.
 * Extracted from ClinicSettingsCommandService to keep each service under 400 lines.
 */
@Injectable()
export class ClinicDataSubjectRequestService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
    private auditService: AuditService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async createDataSubjectRequest(
    clinicId: string,
    input: CreateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    if (input.patientId) {
      const patient = await this.persistence.patient.findFirst({
        where: { id: input.patientId, clinicId, deletedAt: null },
        select: { id: true },
      });

      if (!patient) {
        throw new NotFoundException('Patient was not found in this clinic');
      }
    }

    const now = this.clock.now();
    const dueAt = input.dueAt
      ? new Date(input.dueAt)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid due date');
    }

    const request = await this.persistence.dataSubjectRequest.create({
      data: {
        clinicId,
        patientId: input.patientId || undefined,
        requestType: input.requestType,
        requestedByName: input.requestedByName,
        requestedByRelation: input.requestedByRelation,
        requestChannel: input.requestChannel,
        requestDetails: input.requestDetails,
        dueAt,
      },
    });

    await this.auditService.logAction({
      clinicId,
      userId: actorUserId,
      actionType: 'DATA_SUBJECT_REQUEST_CREATED',
      resourceType: 'DataSubjectRequest',
      resourceId: request.id,
      ipAddress,
      metadata: {
        requestType: request.requestType,
        status: request.status,
        patientId: request.patientId,
      },
    });

    return request;
  }

  async updateDataSubjectRequest(
    clinicId: string,
    requestId: string,
    input: UpdateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    const existing = await this.persistence.dataSubjectRequest.findFirst({
      where: { id: requestId, clinicId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException('Data subject request was not found');
    }

    const dueAt =
      input.dueAt === null
        ? null
        : input.dueAt
          ? new Date(input.dueAt)
          : undefined;

    if (dueAt instanceof Date && Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid due date');
    }

    const closedStatuses = new Set<DataSubjectRequestStatus>([
      DataSubjectRequestStatus.FULFILLED,
      DataSubjectRequestStatus.REJECTED,
      DataSubjectRequestStatus.CANCELLED,
    ]);
    const nextStatus = input.status;
    const completedAt =
      nextStatus && closedStatuses.has(nextStatus)
        ? this.clock.now()
        : undefined;

    const request = await this.persistence.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        dueAt,
        resolutionNotes: input.resolutionNotes,
        completedAt,
        handledAt: nextStatus ? this.clock.now() : undefined,
        handledById: nextStatus ? actorUserId : undefined,
      },
    });

    await this.auditService.logAction({
      clinicId,
      userId: actorUserId,
      actionType: 'DATA_SUBJECT_REQUEST_UPDATED',
      resourceType: 'DataSubjectRequest',
      resourceId: request.id,
      ipAddress,
      metadata: {
        previousStatus: existing.status,
        nextStatus: request.status,
        requestType: request.requestType,
      },
    });

    return request;
  }
}

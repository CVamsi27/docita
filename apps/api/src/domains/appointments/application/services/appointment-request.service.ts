import { Injectable } from '@nestjs/common';
import type {
  AppointmentRequestListResponse,
  AppointmentRequestResponse,
  ApproveAppointmentRequest,
  ListAppointmentRequestsQuery,
  PatientAppointmentRequestCreate,
  RejectAppointmentRequest,
} from '@workspace/types';
import { AppointmentRequestCommandService } from './appointment-request-command.service';
import { AppointmentRequestQueryService } from './appointment-request-query.service';

/**
 * Facade — delegates appointment request reads and reviews to query/command services.
 */
@Injectable()
export class AppointmentRequestService {
  constructor(
    private readonly queryService: AppointmentRequestQueryService,
    private readonly commandService: AppointmentRequestCommandService,
  ) {}

  createPatientRequest(
    patientId: string,
    clinicId: string,
    data: PatientAppointmentRequestCreate,
  ): Promise<AppointmentRequestResponse> {
    return this.commandService.createPatientRequest(patientId, clinicId, data);
  }

  listRequests(
    clinicId: string,
    filters?: ListAppointmentRequestsQuery,
  ): Promise<AppointmentRequestListResponse> {
    return this.queryService.listRequests(clinicId, filters);
  }

  approveRequest(
    id: string,
    clinicId: string,
    reviewedById: string,
    data: ApproveAppointmentRequest,
  ): Promise<AppointmentRequestResponse> {
    return this.commandService.approveRequest(id, clinicId, reviewedById, data);
  }

  rejectRequest(
    id: string,
    clinicId: string,
    reviewedById: string,
    data: RejectAppointmentRequest,
  ): Promise<AppointmentRequestResponse> {
    return this.commandService.rejectRequest(id, clinicId, reviewedById, data);
  }
}

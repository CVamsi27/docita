import { Injectable } from '@nestjs/common';
import { PatientPortalCommandService } from './patient-portal-command.service';
import { PatientPortalQueryService } from './patient-portal-query.service';

/**
 * Facade — delegates patient portal reads and mutations to query/command services.
 */
@Injectable()
export class PatientPortalService {
  constructor(
    private readonly queryService: PatientPortalQueryService,
    private readonly commandService: PatientPortalCommandService,
  ) {}

  getDashboard(userId: string) {
    return this.queryService.getDashboard(userId);
  }

  getAppointments(
    userId: string,
    filters?: Parameters<PatientPortalQueryService['getAppointments']>[1],
  ) {
    return this.queryService.getAppointments(userId, filters);
  }

  getAppointmentById(userId: string, appointmentId: string) {
    return this.queryService.getAppointmentById(userId, appointmentId);
  }

  getPrescriptions(
    userId: string,
    filters?: Parameters<PatientPortalQueryService['getPrescriptions']>[1],
  ) {
    return this.queryService.getPrescriptions(userId, filters);
  }

  getPrescriptionById(userId: string, prescriptionId: string) {
    return this.queryService.getPrescriptionById(userId, prescriptionId);
  }

  getInvoices(
    userId: string,
    filters?: Parameters<PatientPortalQueryService['getInvoices']>[1],
  ) {
    return this.queryService.getInvoices(userId, filters);
  }

  getProfile(userId: string) {
    return this.queryService.getProfile(userId);
  }

  updateProfile(
    userId: string,
    data: Parameters<PatientPortalCommandService['updateProfile']>[1],
  ) {
    return this.commandService.updateProfile(userId, data);
  }

  getConsent(userId: string) {
    return this.queryService.getConsent(userId);
  }

  updateConsent(
    userId: string,
    data: Parameters<PatientPortalCommandService['updateConsent']>[1],
  ) {
    return this.commandService.updateConsent(userId, data);
  }

  requestDataDeletion(
    userId: string,
    data: Parameters<PatientPortalCommandService['requestDataDeletion']>[1],
  ) {
    return this.commandService.requestDataDeletion(userId, data);
  }
}

import { Injectable } from '@nestjs/common';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { StaffManagementService } from './staff-management.service';
import { Role } from '@workspace/db';
import type { ClinicSettingsData } from './clinic-settings.types';
import type {
  CreateClinicData,
  JoinClinicData,
  UpdateClinicData,
} from './clinic-data.types';
import type {
  CreateClinicMemberData,
  CreateDoctorData,
  CreateReceptionistData,
  UpdateMemberData,
} from './staff-management-helpers';

/**
 * Thin facade — delegates clinic CRUD, settings, and staff to focused services.
 */
@Injectable()
export class ClinicsService {
  constructor(
    private clinicDataService: ClinicDataService,
    private clinicSettingsService: ClinicSettingsService,
    private staffManagementService: StaffManagementService,
  ) {}

  async create(data: CreateClinicData) {
    return this.clinicDataService.create(data);
  }

  async findAll() {
    return this.clinicDataService.findAll();
  }

  async findOne(id: string) {
    return this.clinicDataService.findOne(id);
  }

  async update(id: string, data: UpdateClinicData) {
    return this.clinicDataService.update(id, data);
  }

  async delete(id: string) {
    return this.clinicDataService.delete(id);
  }

  async getUserClinics(userId: string) {
    return this.clinicDataService.getUserClinics(userId);
  }

  async getClinicStats(clinicId: string) {
    return this.clinicDataService.getClinicStats(clinicId);
  }

  async updateSettings(id: string, data: ClinicSettingsData) {
    return this.clinicSettingsService.updateSettings(id, data);
  }

  async getComplianceSummary(clinicId: string) {
    return this.clinicSettingsService.getComplianceSummary(clinicId);
  }

  listDataSubjectRequests(
    clinicId: string,
    status?: Parameters<ClinicSettingsService['listDataSubjectRequests']>[1],
  ) {
    return this.clinicSettingsService.listDataSubjectRequests(clinicId, status);
  }

  // This facade is a thin pass-through by design — these delegators repeat
  // the signatures of the focused services they wrap (and those services in
  // turn repeat their command-service signatures), which is structural to
  // the layered DDD pattern rather than copy-paste drift.
  // jscpd:ignore-start
  createDataSubjectRequest(
    clinicId: string,
    input: Parameters<ClinicSettingsService['createDataSubjectRequest']>[1],
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.clinicSettingsService.createDataSubjectRequest(
      clinicId,
      input,
      actorUserId,
      ipAddress,
    );
  }

  updateDataSubjectRequest(
    clinicId: string,
    requestId: string,
    input: Parameters<ClinicSettingsService['updateDataSubjectRequest']>[2],
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.clinicSettingsService.updateDataSubjectRequest(
      clinicId,
      requestId,
      input,
      actorUserId,
      ipAddress,
    );
  }
  // jscpd:ignore-end

  async getPrescriptionDefaults(clinicId: string) {
    return this.clinicSettingsService.getPrescriptionDefaults(clinicId);
  }

  async updatePrescriptionDefaults(
    clinicId: string,
    data: Record<string, unknown>,
  ) {
    return this.clinicSettingsService.updatePrescriptionDefaults(
      clinicId,
      data,
    );
  }

  async getOpdSlipSettings(clinicId: string) {
    return this.clinicSettingsService.getOpdSlipSettings(clinicId);
  }

  async updateOpdSlipSettings(
    clinicId: string,
    data: { revisitValidityDays?: number; footerNote?: string },
  ) {
    return this.clinicSettingsService.updateOpdSlipSettings(clinicId, data);
  }

  async createDoctor(clinicId: string, data: CreateDoctorData) {
    return this.staffManagementService.createDoctor(clinicId, data);
  }

  async getDoctors(clinicId: string) {
    return this.staffManagementService.getDoctors(clinicId);
  }

  async createReceptionist(clinicId: string, data: CreateReceptionistData) {
    return this.staffManagementService.createReceptionist(clinicId, data);
  }

  async createMember(clinicId: string, data: CreateClinicMemberData) {
    return this.staffManagementService.createMember(clinicId, data);
  }

  async getReceptionists(clinicId: string) {
    return this.staffManagementService.getReceptionists(clinicId);
  }

  async getMembers(clinicId: string) {
    return this.staffManagementService.getMembers(clinicId);
  }

  // Pass-through delegator — see the jscpd note above `createDataSubjectRequest`
  // for why this signature intentionally mirrors `StaffManagementService.updateMember`.
  // jscpd:ignore-start
  async updateMember(
    clinicId: string,
    memberId: string,
    data: UpdateMemberData,
    actorUserId: string,
    actorRole: Role,
  ) {
    return this.staffManagementService.updateMember(
      clinicId,
      memberId,
      data,
      actorUserId,
      actorRole,
    );
  }
  // jscpd:ignore-end

  async removeMember(clinicId: string, memberId: string, actorUserId: string) {
    return this.staffManagementService.removeMember(
      clinicId,
      memberId,
      actorUserId,
    );
  }

  async joinClinicForUser(userId: string, data: JoinClinicData) {
    return this.clinicDataService.joinClinicForUser(userId, data);
  }

  async searchActive(query: string) {
    return this.clinicDataService.searchActive(query);
  }
}

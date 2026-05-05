import { Injectable } from '@nestjs/common';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { StaffManagementService } from './staff-management.service';
import { ClinicTier, ClinicType, Prisma, Role } from '@workspace/db';
import type { WorkspaceProfile } from '@workspace/types';

interface CreateClinicData {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: Prisma.InputJsonValue;
}

interface UpdateClinicData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: Prisma.InputJsonValue;
}

interface ClinicSettingsData {
  name?: string;
  address?: string;
  phone?: string;
  phoneNumber?: string;
  gstin?: string;
  email?: string;
  website?: string;
  description?: string;
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  consultationDuration?: number;
  reminderBefore?: string | number;
  reminderUnit?: string;
  whatsappAppointmentReminders?: boolean;
  whatsappFollowUpMessages?: boolean;
  whatsappBirthdayWishes?: boolean;
  whatsappMedicineReminders?: boolean;
  customFields?: { name: string; type: string; required: boolean }[];
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  appointmentAlerts?: boolean;
  reportAlerts?: boolean;
  twoFactorAuth?: boolean;
  sessionTimeout?: string | number;
  auditLogs?: boolean;
  theme?: string;
  primaryColor?: string;
  compactMode?: boolean;
  paymentReminderEnabled?: boolean;
  paymentReminderDays?: number[];
  paymentReminderAutoSendWhatsApp?: boolean;
  useSameBankAccountForSubscriptionAndReceipts?: boolean;
  subscriptionPaymentBankAccount?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
    upiId?: string;
  };
  paymentReceivingBankAccount?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
    upiId?: string;
  };

  workspaceProfile?: WorkspaceProfile;
}

interface CreateDoctorData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

interface CreateReceptionistData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: 'RECEPTIONIST' | 'NURSE';
}

interface CreateClinicMemberData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'ADMIN' | 'ADMIN_DOCTOR';
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

interface UpdateMemberData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'ADMIN' | 'ADMIN_DOCTOR';
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

interface JoinClinicData {
  clinicCode?: string;
  clinicEmail?: string;
}

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

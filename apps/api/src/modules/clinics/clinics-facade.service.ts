import { Injectable } from '@nestjs/common';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { StaffManagementService } from './staff-management.service';
import { ClinicTier, ClinicType, Prisma } from '@workspace/db';

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
}

@Injectable()
export class ClinicsService {
  constructor(
    private clinicDataService: ClinicDataService,
    private clinicSettingsService: ClinicSettingsService,
    private staffManagementService: StaffManagementService,
  ) {}

  // Clinic CRUD operations
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

  // Clinic data queries
  async getUserClinics(userId: string) {
    return this.clinicDataService.getUserClinics(userId);
  }

  async getClinicStats(clinicId: string) {
    return this.clinicDataService.getClinicStats(clinicId);
  }

  // Clinic settings
  async updateSettings(id: string, data: ClinicSettingsData) {
    return this.clinicSettingsService.updateSettings(id, data);
  }

  async getPrescriptionDefaults(clinicId: string) {
    return this.clinicSettingsService.getPrescriptionDefaults(clinicId);
  }

  async updatePrescriptionDefaults(clinicId: string, data: Record<string, unknown>) {
    return this.clinicSettingsService.updatePrescriptionDefaults(clinicId, data);
  }

  // Staff management
  async createDoctor(clinicId: string, data: CreateDoctorData) {
    return this.staffManagementService.createDoctor(clinicId, data);
  }

  async getDoctors(clinicId: string) {
    return this.staffManagementService.getDoctors(clinicId);
  }

  async createReceptionist(clinicId: string, data: CreateReceptionistData) {
    return this.staffManagementService.createReceptionist(clinicId, data);
  }

  async getReceptionists(clinicId: string) {
    return this.staffManagementService.getReceptionists(clinicId);
  }

  async getMembers(clinicId: string) {
    return this.staffManagementService.getMembers(clinicId);
  }
}

import { Injectable } from '@nestjs/common';
import { DataSubjectRequestStatus } from '@workspace/db';
import type {
  AppComplianceSummary,
  CreateDataSubjectRequest,
  UpdateDataSubjectRequest,
} from '@workspace/types';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsQueryService } from './clinic-settings-query.service';
import { ClinicSettingsCommandService } from './clinic-settings-command.service';

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
  avgConsultationMinutes?: number;
  lateArrivalGraceMinutes?: number;
  queueBufferMinutes?: number;
  useDoctorQueues?: boolean;
  followUpReminderEnabled?: boolean;
  followUpReminderBefore?: string;
  followUpReminderUnit?: string;
  invoiceReminderEnabled?: boolean;
  invoiceReminderBefore?: string;
  invoiceReminderUnit?: string;
  prescriptionReminderEnabled?: boolean;
  prescriptionReminderBefore?: string;
  prescriptionReminderUnit?: string;
  scheduleNotificationEnabled?: boolean;
  scheduleNotificationBefore?: string;
  scheduleNotificationUnit?: string;
  whatsappPreAppointmentEnabled?: boolean;
  whatsappPreAppointmentMinutes?: number;
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

  facilityLabel?: 'CLINIC' | 'HOSPITAL';

  taxSettings?: {
    countryCode: string;
    regime?: 'IN_GST' | 'VAT' | 'SALES_TAX' | 'NONE';
    registrationId?: string;
    registrationLabel?: string;
  };

  sidebarNavOrder?: unknown;

  mapsLink?: string;

  brandName?: string;
  lockedTheme?: {
    primaryColor?: string;
    mode?: 'light' | 'dark' | 'system';
    compactMode?: boolean;
    enforced?: boolean;
  };
}

/**
 * Facade that preserves the original ClinicSettingsService constructor
 * signature and public API while delegating to the query/command services.
 */
@Injectable()
export class ClinicSettingsService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
    private settingsFactory: SettingsFactory,
    private auditService: AuditService,
    private clinicDataService: ClinicDataService,
    private queryService: ClinicSettingsQueryService,
    private commandService: ClinicSettingsCommandService,
  ) {}

  updateSettings(id: string, data: ClinicSettingsData) {
    return this.commandService.updateSettings(id, data);
  }

  getComplianceSummary(clinicId: string): Promise<AppComplianceSummary> {
    return this.queryService.getComplianceSummary(clinicId);
  }

  listDataSubjectRequests(clinicId: string, status?: DataSubjectRequestStatus) {
    return this.queryService.listDataSubjectRequests(clinicId, status);
  }

  createDataSubjectRequest(
    clinicId: string,
    input: CreateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.commandService.createDataSubjectRequest(
      clinicId,
      input,
      actorUserId,
      ipAddress,
    );
  }

  updateDataSubjectRequest(
    clinicId: string,
    requestId: string,
    input: UpdateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.commandService.updateDataSubjectRequest(
      clinicId,
      requestId,
      input,
      actorUserId,
      ipAddress,
    );
  }

  getPrescriptionDefaults(clinicId: string) {
    return this.queryService.getPrescriptionDefaults(clinicId);
  }

  updatePrescriptionDefaults(clinicId: string, data: Record<string, unknown>) {
    return this.commandService.updatePrescriptionDefaults(clinicId, data);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  Prisma,
} from '@workspace/db';
import { Feature } from '@workspace/types';
import { assertClinicHasFeatureOrThrow } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import type {
  AppComplianceSummary,
  CreateDataSubjectRequest,
  UpdateDataSubjectRequest,
  WorkspaceProfile,
} from '@workspace/types';
import { ClinicDataService } from './clinic-data.service';

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

  workspaceProfile?: WorkspaceProfile;
}

@Injectable()
export class ClinicSettingsService {
  constructor(
    private prisma: PrismaService,
    private settingsFactory: SettingsFactory,
    private auditService: AuditService,
    private clinicDataService: ClinicDataService,
  ) {}

  private payloadTouchesKeys(
    data: ClinicSettingsData,
    keys: (keyof ClinicSettingsData)[],
  ): boolean {
    return keys.some((key) => data[key] !== undefined);
  }

  private async assertTierGatedSettingsAllowed(
    clinicId: string,
    data: ClinicSettingsData,
  ): Promise<void> {
    const whatsappKeys: (keyof ClinicSettingsData)[] = [
      'whatsappAppointmentReminders',
      'whatsappFollowUpMessages',
      'whatsappBirthdayWishes',
      'whatsappMedicineReminders',
      'whatsappPreAppointmentEnabled',
      'whatsappPreAppointmentMinutes',
      'paymentReminderAutoSendWhatsApp',
    ];
    const queueKeys: (keyof ClinicSettingsData)[] = [
      'useDoctorQueues',
      'queueBufferMinutes',
    ];
    const invoicingKeys: (keyof ClinicSettingsData)[] = [
      'invoiceReminderEnabled',
      'invoiceReminderBefore',
      'invoiceReminderUnit',
    ];
    const auditKeys: (keyof ClinicSettingsData)[] = ['auditLogs'];
    const autoReminderKeys: (keyof ClinicSettingsData)[] = [
      'followUpReminderEnabled',
      'followUpReminderBefore',
      'followUpReminderUnit',
      'paymentReminderEnabled',
      'paymentReminderDays',
      'prescriptionReminderEnabled',
      'prescriptionReminderBefore',
      'prescriptionReminderUnit',
    ];

    const needsCheck =
      this.payloadTouchesKeys(data, whatsappKeys) ||
      this.payloadTouchesKeys(data, queueKeys) ||
      this.payloadTouchesKeys(data, invoicingKeys) ||
      this.payloadTouchesKeys(data, auditKeys) ||
      this.payloadTouchesKeys(data, autoReminderKeys);

    if (!needsCheck) {
      return;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const snapshot = {
      tier: clinic.tier,
      intelligenceAddon: clinic.intelligenceAddon,
      features: clinic.features,
    };

    if (this.payloadTouchesKeys(data, whatsappKeys)) {
      assertClinicHasFeatureOrThrow(snapshot, Feature.WHATSAPP_MESSAGING);
    }
    if (this.payloadTouchesKeys(data, queueKeys)) {
      assertClinicHasFeatureOrThrow(snapshot, Feature.QUEUE_MANAGEMENT);
    }
    if (this.payloadTouchesKeys(data, invoicingKeys)) {
      assertClinicHasFeatureOrThrow(snapshot, Feature.INVOICING);
    }
    if (this.payloadTouchesKeys(data, auditKeys)) {
      assertClinicHasFeatureOrThrow(snapshot, Feature.AUDIT_LOGS);
    }
    if (this.payloadTouchesKeys(data, autoReminderKeys)) {
      assertClinicHasFeatureOrThrow(snapshot, Feature.AUTO_REMINDERS);
    }
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private readString(
    source: Record<string, unknown>,
    key: string,
    fallback: string,
  ): string {
    const value = source[key];
    return typeof value === 'string' ? value : fallback;
  }

  private readBoolean(
    source: Record<string, unknown>,
    key: string,
    fallback: boolean,
  ): boolean {
    const value = source[key];
    return typeof value === 'boolean' ? value : fallback;
  }

  async updateSettings(id: string, data: ClinicSettingsData) {
    await this.assertTierGatedSettingsAllowed(id, data);

    const settingsToValidate = {
      description: data.description,
      openingTime: data.openingTime,
      closingTime: data.closingTime,
      workingDays: data.workingDays,
      consultationDuration: data.consultationDuration,
      reminderBefore: data.reminderBefore,
      reminderUnit: data.reminderUnit,
      whatsappAppointmentReminders: data.whatsappAppointmentReminders,
      whatsappFollowUpMessages: data.whatsappFollowUpMessages,
      whatsappBirthdayWishes: data.whatsappBirthdayWishes,
      whatsappMedicineReminders: data.whatsappMedicineReminders,
      customFields: data.customFields,
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      pushNotifications: data.pushNotifications,
      appointmentAlerts: data.appointmentAlerts,
      reportAlerts: data.reportAlerts,
      twoFactorAuth: data.twoFactorAuth,
      sessionTimeout: data.sessionTimeout,
      auditLogs: data.auditLogs,
      theme: data.theme,
      primaryColor: data.primaryColor,
      compactMode: data.compactMode,
      followUpReminderEnabled: data.followUpReminderEnabled,
      followUpReminderBefore: data.followUpReminderBefore,
      followUpReminderUnit: data.followUpReminderUnit,
      invoiceReminderEnabled: data.invoiceReminderEnabled,
      invoiceReminderBefore: data.invoiceReminderBefore,
      invoiceReminderUnit: data.invoiceReminderUnit,
      prescriptionReminderEnabled: data.prescriptionReminderEnabled,
      prescriptionReminderBefore: data.prescriptionReminderBefore,
      prescriptionReminderUnit: data.prescriptionReminderUnit,
      scheduleNotificationEnabled: data.scheduleNotificationEnabled,
      scheduleNotificationBefore: data.scheduleNotificationBefore,
      scheduleNotificationUnit: data.scheduleNotificationUnit,
      whatsappPreAppointmentEnabled: data.whatsappPreAppointmentEnabled,
      whatsappPreAppointmentMinutes: data.whatsappPreAppointmentMinutes,
      paymentReminderEnabled: data.paymentReminderEnabled,
      paymentReminderDays: data.paymentReminderDays,
      paymentReminderAutoSendWhatsApp: data.paymentReminderAutoSendWhatsApp,
      useSameBankAccountForSubscriptionAndReceipts:
        data.useSameBankAccountForSubscriptionAndReceipts,
      subscriptionPaymentBankAccount: data.subscriptionPaymentBankAccount,
      paymentReceivingBankAccount: data.paymentReceivingBankAccount,
      facilityLabel: data.facilityLabel,
      taxSettings: data.taxSettings,
      workspaceProfile: data.workspaceProfile,
    };

    const cleanSettings = Object.fromEntries(
      Object.entries(settingsToValidate).filter(([_, v]) => v !== undefined),
    );

    const validatedSettings =
      this.settingsFactory.partialValidate(cleanSettings);

    const existingClinic = await this.prisma.clinic.findUnique({
      where: { id },
      select: { settings: true },
    });
    const existingSettings = this.toRecord(existingClinic?.settings);

    const resolvedSettings = {
      ...existingSettings,
      ...validatedSettings,
    };

    const useSameBankAccount =
      data.useSameBankAccountForSubscriptionAndReceipts === true;

    if (
      useSameBankAccount &&
      data.subscriptionPaymentBankAccount &&
      !data.paymentReceivingBankAccount
    ) {
      resolvedSettings.paymentReceivingBankAccount =
        data.subscriptionPaymentBankAccount;
    }

    await this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phoneNumber || data.phone,
        settings: this.toInputJsonValue({
          ...resolvedSettings,
          ...(data.gstin !== undefined && {
            gstin: data.gstin || undefined,
          }),
        }),
        email: data.email,
        website: data.website,
        ...(data.avgConsultationMinutes !== undefined && {
          avgConsultationMinutes: data.avgConsultationMinutes,
        }),
        ...(data.lateArrivalGraceMinutes !== undefined && {
          lateArrivalGraceMinutes: data.lateArrivalGraceMinutes,
        }),
        ...(data.queueBufferMinutes !== undefined && {
          queueBufferMinutes: data.queueBufferMinutes,
        }),
        ...(data.useDoctorQueues !== undefined && {
          useDoctorQueues: data.useDoctorQueues,
        }),
      },
    });

    const mapped = await this.clinicDataService.findOne(id);
    if (!mapped) {
      throw new NotFoundException('Clinic not found');
    }
    return mapped;
  }

  async getComplianceSummary(clinicId: string): Promise<AppComplianceSummary> {
    const openRequestStatuses = [
      DataSubjectRequestStatus.OPEN,
      DataSubjectRequestStatus.IN_REVIEW,
    ];
    const [clinic, activeTemplate, requestCounts] = await Promise.all([
      this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          slaSignatureUrl: true,
          slaSignatureAcceptedAt: true,
        },
      }),
      this.prisma.consentTemplate.findFirst({
        where: {
          OR: [{ clinicId }, { clinicId: null }],
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.dataSubjectRequest.groupBy({
        by: ['requestType'],
        where: {
          clinicId,
          status: { in: openRequestStatuses },
        },
        _count: { _all: true },
      }),
    ]);
    const countByType = new Map(
      requestCounts.map((item) => [item.requestType, item._count._all]),
    );

    return {
      slaSignatureUrl: clinic?.slaSignatureUrl ?? null,
      slaSignatureAcceptedAt:
        clinic?.slaSignatureAcceptedAt?.toISOString() ?? null,
      consentTemplateEnabled: Boolean(activeTemplate),
      consentTemplateUpdatedAt: activeTemplate?.updatedAt.toISOString() ?? null,
      withdrawalRequestsOpen:
        countByType.get(DataSubjectRequestType.CONSENT_WITHDRAWAL) ?? 0,
      dataExportRequestsOpen:
        (countByType.get(DataSubjectRequestType.ACCESS) ?? 0) +
        (countByType.get(DataSubjectRequestType.EXPORT) ?? 0),
      dataDeletionRequestsOpen:
        countByType.get(DataSubjectRequestType.DELETION) ?? 0,
    };
  }

  listDataSubjectRequests(clinicId: string, status?: DataSubjectRequestStatus) {
    return this.prisma.dataSubjectRequest.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async createDataSubjectRequest(
    clinicId: string,
    input: CreateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    if (input.patientId) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: input.patientId, clinicId, deletedAt: null },
        select: { id: true },
      });

      if (!patient) {
        throw new NotFoundException('Patient was not found in this clinic');
      }
    }

    const dueAt = input.dueAt
      ? new Date(input.dueAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid due date');
    }

    const request = await this.prisma.dataSubjectRequest.create({
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
    const existing = await this.prisma.dataSubjectRequest.findFirst({
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
      nextStatus && closedStatuses.has(nextStatus) ? new Date() : undefined;

    const request = await this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        dueAt,
        resolutionNotes: input.resolutionNotes,
        completedAt,
        handledAt: nextStatus ? new Date() : undefined,
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

  async getPrescriptionDefaults(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    if (!clinic) return null;

    const settings = this.toRecord(clinic.settings);

    return {
      defaultInstructions: this.readString(settings, 'defaultInstructions', ''),
      defaultFooterText: this.readString(settings, 'defaultFooterText', ''),
      includeClinicHeader: this.readBoolean(
        settings,
        'includeClinicHeader',
        true,
      ),
      includeDoctorSignature: this.readBoolean(
        settings,
        'includeDoctorSignature',
        true,
      ),
      includeQRCode: this.readBoolean(settings, 'includeQRCode', false),
    };
  }

  async updatePrescriptionDefaults(
    clinicId: string,
    data: Record<string, unknown>,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    const currentSettings = this.toRecord(clinic?.settings);
    const mergedSettings = {
      ...currentSettings,
      ...data,
    };

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        settings: this.toInputJsonValue(mergedSettings),
      },
    });
  }
}

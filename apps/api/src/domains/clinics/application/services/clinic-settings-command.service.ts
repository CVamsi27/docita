import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { Feature } from '@workspace/types';
import { assertClinicHasFeatureOrThrow } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import type {
  CreateDataSubjectRequest,
  UpdateDataSubjectRequest,
} from '@workspace/types';
import { ClinicDataService } from './clinic-data.service';
import { ClinicDataSubjectRequestService } from './clinic-data-subject-request.service';
import type { ClinicSettingsData } from './clinic-settings.types';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';

/**
 * Manages clinic settings mutations: updating clinic configuration and prescription defaults.
 * Data-subject request operations are delegated to ClinicDataSubjectRequestService.
 */
@Injectable()
export class ClinicSettingsCommandService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
    private settingsFactory: SettingsFactory,
    private clinicDataService: ClinicDataService,
    private dataSubjectRequestService: ClinicDataSubjectRequestService,
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
    const whiteLabelKeys: (keyof ClinicSettingsData)[] = ['brandName'];
    const lockedThemeKeys: (keyof ClinicSettingsData)[] = ['lockedTheme'];

    const needsCheck =
      this.payloadTouchesKeys(data, whatsappKeys) ||
      this.payloadTouchesKeys(data, queueKeys) ||
      this.payloadTouchesKeys(data, invoicingKeys) ||
      this.payloadTouchesKeys(data, auditKeys) ||
      this.payloadTouchesKeys(data, autoReminderKeys) ||
      this.payloadTouchesKeys(data, whiteLabelKeys) ||
      this.payloadTouchesKeys(data, lockedThemeKeys);

    if (!needsCheck) {
      return;
    }

    const clinic = await this.persistence.clinic.findUnique({
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
    if (this.payloadTouchesKeys(data, whiteLabelKeys)) {
      assertClinicHasFeatureOrThrow(snapshot, Feature.WHITE_LABEL_BRANDING);
    }
    if (this.payloadTouchesKeys(data, lockedThemeKeys)) {
      assertClinicHasFeatureOrThrow(snapshot, Feature.LOCKED_CUSTOM_THEME);
    }
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return Object.fromEntries(Object.entries(value));
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
      taxSettings: data.taxSettings,
      mapsLink: data.mapsLink,
    };

    const cleanSettings = Object.fromEntries(
      Object.entries(settingsToValidate).filter(([_, v]) => v !== undefined),
    );

    const validatedSettings =
      this.settingsFactory.partialValidate(cleanSettings);

    const existingClinic = await this.persistence.clinic.findUnique({
      where: { id },
      select: { settings: true, branding: true },
    });
    const existingSettings = this.toRecord(existingClinic?.settings);
    const existingBranding = this.toRecord(existingClinic?.branding);

    const resolvedSettings = {
      ...existingSettings,
      ...validatedSettings,
      ...(data.sidebarNavOrder !== undefined && {
        sidebarNavOrder: data.sidebarNavOrder,
      }),
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

    const hasBrandingUpdate =
      data.brandName !== undefined || data.lockedTheme !== undefined;
    const resolvedBranding = hasBrandingUpdate
      ? {
          ...existingBranding,
          ...(data.brandName !== undefined && { brandName: data.brandName }),
          ...(data.lockedTheme !== undefined && {
            lockedTheme: data.lockedTheme,
          }),
        }
      : undefined;

    await this.persistence.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phoneNumber || data.phone,
        settings: toPrismaInputJsonValue({
          ...resolvedSettings,
          ...(data.gstin !== undefined && {
            gstin: data.gstin || undefined,
          }),
        }),
        ...(resolvedBranding !== undefined && {
          branding: toPrismaInputJsonValue(resolvedBranding),
        }),
        email: data.email,
        website: data.website,
        ...(data.facilityLabel !== undefined && {
          facilityType: data.facilityLabel,
        }),
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

  createDataSubjectRequest(
    clinicId: string,
    input: CreateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.dataSubjectRequestService.createDataSubjectRequest(
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
    return this.dataSubjectRequestService.updateDataSubjectRequest(
      clinicId,
      requestId,
      input,
      actorUserId,
      ipAddress,
    );
  }

  async updatePrescriptionDefaults(
    clinicId: string,
    data: Record<string, unknown>,
  ) {
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    const currentSettings = this.toRecord(clinic?.settings);
    const mergedSettings = {
      ...currentSettings,
      ...data,
    };

    return this.persistence.clinic.update({
      where: { id: clinicId },
      data: {
        settings: toPrismaInputJsonValue(mergedSettings),
      },
    });
  }

  async updateOpdSlipSettings(
    clinicId: string,
    data: { revisitValidityDays?: number; footerNote?: string },
  ) {
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    const currentSettings = this.toRecord(clinic?.settings);
    const mergedSettings: Record<string, unknown> = { ...currentSettings };

    if (data.revisitValidityDays !== undefined) {
      mergedSettings.opdSlipRevisitValidityDays = data.revisitValidityDays;
    }
    if (data.footerNote !== undefined) {
      mergedSettings.opdSlipFooterNote = data.footerNote;
    }

    return this.persistence.clinic.update({
      where: { id: clinicId },
      data: {
        settings: toPrismaInputJsonValue(mergedSettings),
      },
    });
  }
}

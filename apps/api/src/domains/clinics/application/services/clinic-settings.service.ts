import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';

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
}

@Injectable()
export class ClinicSettingsService {
  constructor(
    private prisma: PrismaService,
    private settingsFactory: SettingsFactory,
  ) {}

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
      paymentReminderEnabled: data.paymentReminderEnabled,
      paymentReminderDays: data.paymentReminderDays,
      paymentReminderAutoSendWhatsApp: data.paymentReminderAutoSendWhatsApp,
      useSameBankAccountForSubscriptionAndReceipts:
        data.useSameBankAccountForSubscriptionAndReceipts,
      subscriptionPaymentBankAccount: data.subscriptionPaymentBankAccount,
      paymentReceivingBankAccount: data.paymentReceivingBankAccount,
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

    return this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phoneNumber || data.phone,
        email: data.email,
        website: data.website,
        settings: this.toInputJsonValue(resolvedSettings),
      },
    });
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

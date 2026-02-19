import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { SettingsFactory } from './factories/settings.factory';

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

  async updateSettings(id: string, data: ClinicSettingsData) {
    // Extract settings-level fields
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

    // Remove undefined values
    const cleanSettings = Object.fromEntries(
      Object.entries(settingsToValidate).filter(([_, v]) => v !== undefined),
    );

    // Validate using factory
    const validatedSettings =
      this.settingsFactory.partialValidate(cleanSettings);

    const existingClinic = await this.prisma.clinic.findUnique({
      where: { id },
      select: { settings: true },
    });
    const existingSettings =
      (existingClinic?.settings as Record<string, unknown>) || {};

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
        settings: resolvedSettings as Prisma.InputJsonValue,
      },
    });
  }

  async getPrescriptionDefaults(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    if (!clinic) return null;

    const settings = clinic.settings as Record<string, any> | null;

    return {
      defaultInstructions: settings?.defaultInstructions ?? '',
      defaultFooterText: settings?.defaultFooterText ?? '',
      includeClinicHeader: settings?.includeClinicHeader ?? true,
      includeDoctorSignature: settings?.includeDoctorSignature ?? true,
      includeQRCode: settings?.includeQRCode ?? false,
    };
  }

  async updatePrescriptionDefaults(
    clinicId: string,
    data: Record<string, unknown>,
  ) {
    // First get existing settings to merge
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    const currentSettings = (clinic?.settings as Record<string, any>) || {};

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        settings: {
          ...currentSettings,
          ...data,
        },
      },
    });
  }
}

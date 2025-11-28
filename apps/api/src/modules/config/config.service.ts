import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  APPOINTMENT_TYPE_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  USER_ROLE_OPTIONS,
  WEEKDAY_OPTIONS,
  CUSTOM_FIELD_TYPE_OPTIONS,
  TEMPLATE_FIELD_TYPE_OPTIONS,
  SPECIALTY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  APPOINTMENT_DURATION_OPTIONS,
  WHATSAPP_MESSAGE_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  DEFAULT_APPOINTMENT_DURATION,
  DEFAULT_CONSULTATION_FEE,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  DEFAULT_INVOICE_ITEMS,
  PATIENT_IMPORT_FIELDS,
  getFormOptions,
  getDefaults,
} from '@workspace/types';

// Re-export all configuration constants for backward compatibility
export {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  APPOINTMENT_TYPE_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  USER_ROLE_OPTIONS,
  WEEKDAY_OPTIONS,
  CUSTOM_FIELD_TYPE_OPTIONS,
  TEMPLATE_FIELD_TYPE_OPTIONS,
  SPECIALTY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  APPOINTMENT_DURATION_OPTIONS,
  WHATSAPP_MESSAGE_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  DEFAULT_APPOINTMENT_DURATION,
  DEFAULT_CONSULTATION_FEE,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  DEFAULT_INVOICE_ITEMS,
  PATIENT_IMPORT_FIELDS,
};

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all form options and configuration
   * This is the single source of truth for the frontend
   */
  getFormOptions() {
    return {
      gender: GENDER_OPTIONS,
      bloodGroup: BLOOD_GROUP_OPTIONS,
      appointmentType: APPOINTMENT_TYPE_OPTIONS,
      appointmentStatus: APPOINTMENT_STATUS_OPTIONS,
      invoiceStatus: INVOICE_STATUS_OPTIONS,
      paymentStatus: PAYMENT_STATUS_OPTIONS,
      userRole: USER_ROLE_OPTIONS,
      weekday: WEEKDAY_OPTIONS,
      customFieldType: CUSTOM_FIELD_TYPE_OPTIONS,
      templateFieldType: TEMPLATE_FIELD_TYPE_OPTIONS,
      specialty: SPECIALTY_OPTIONS,
      documentType: DOCUMENT_TYPE_OPTIONS,
      appointmentDuration: APPOINTMENT_DURATION_OPTIONS,
      whatsappMessageType: WHATSAPP_MESSAGE_TYPE_OPTIONS,
      currency: CURRENCY_OPTIONS,
      timezone: TIMEZONE_OPTIONS,
    };
  }

  /**
   * Get patient import field definitions
   */
  getPatientImportFields() {
    return PATIENT_IMPORT_FIELDS;
  }

  /**
   * Get default values for various forms
   */
  getDefaults() {
    return {
      appointmentDuration: DEFAULT_APPOINTMENT_DURATION,
      consultationFee: DEFAULT_CONSULTATION_FEE,
      currency: DEFAULT_CURRENCY,
      timezone: DEFAULT_TIMEZONE,
      invoiceItems: DEFAULT_INVOICE_ITEMS,
    };
  }

  /**
   * Get complete app configuration
   * Combines form options, defaults, and clinic-specific settings
   */
  async getAppConfig(clinicId?: string) {
    const baseConfig = {
      formOptions: this.getFormOptions(),
      patientImportFields: this.getPatientImportFields(),
      defaults: this.getDefaults(),
    };

    // If clinicId provided, merge clinic-specific settings
    if (clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          settings: true,
          tier: true,
        },
      });

      if (clinic) {
        const clinicSettings =
          (clinic.settings as Record<string, unknown>) || {};

        return {
          ...baseConfig,
          clinicSettings: {
            consultationFee:
              clinicSettings.consultationFee ?? DEFAULT_CONSULTATION_FEE,
            currency: clinicSettings.currency ?? DEFAULT_CURRENCY,
            timezone: clinicSettings.timezone ?? DEFAULT_TIMEZONE,
            appointmentDuration:
              clinicSettings.appointmentDuration ??
              DEFAULT_APPOINTMENT_DURATION,
          },
        };
      }
    }

    return baseConfig;
  }

  /**
   * Validate a value against allowed options
   */
  validateOption(
    optionType: keyof ReturnType<typeof this.getFormOptions>,
    value: string,
  ): boolean {
    const options = this.getFormOptions()[optionType];
    return options.some((opt) => opt.value === value);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
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
  FOLLOW_UP_TYPES,
  REMINDER_DAYS_OPTIONS,
  INVENTORY_CATEGORY_OPTIONS,
  QUEUE_STATUS_OPTIONS,
  WARD_TYPE_OPTIONS,
  BED_NUMBER_OPTIONS,
  TEETH_QUADRANTS,
  TOOTH_CONDITIONS,
} from '@workspace/utils';

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
  FOLLOW_UP_TYPES,
  REMINDER_DAYS_OPTIONS,
  INVENTORY_CATEGORY_OPTIONS,
  QUEUE_STATUS_OPTIONS,
  WARD_TYPE_OPTIONS,
  BED_NUMBER_OPTIONS,
  TEETH_QUADRANTS,
  TOOTH_CONDITIONS,
};

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }

  private readString(
    source: Record<string, unknown>,
    key: string,
    fallback: string,
  ): string {
    const value = source[key];
    return typeof value === 'string' ? value : fallback;
  }

  private readNumber(
    source: Record<string, unknown>,
    key: string,
    fallback: number,
  ): number {
    const value = source[key];
    return typeof value === 'number' ? value : fallback;
  }

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

  getPatientImportFields() {
    return PATIENT_IMPORT_FIELDS;
  }

  getDefaults() {
    return {
      appointmentDuration: DEFAULT_APPOINTMENT_DURATION,
      consultationFee: DEFAULT_CONSULTATION_FEE,
      currency: DEFAULT_CURRENCY,
      timezone: DEFAULT_TIMEZONE,
      invoiceItems: DEFAULT_INVOICE_ITEMS,
    };
  }

  getConstants() {
    return {
      followUpTypes: FOLLOW_UP_TYPES,
      reminderDays: REMINDER_DAYS_OPTIONS,
      inventoryCategories: INVENTORY_CATEGORY_OPTIONS,
      queueStatuses: QUEUE_STATUS_OPTIONS,
      wardTypes: WARD_TYPE_OPTIONS,
      availableBeds: BED_NUMBER_OPTIONS,
      teethQuadrants: TEETH_QUADRANTS,
      toothConditions: TOOTH_CONDITIONS,
    };
  }

  async getAppConfig(clinicId?: string) {
    const baseConfig = {
      formOptions: this.getFormOptions(),
      patientImportFields: this.getPatientImportFields(),
      defaults: this.getDefaults(),
    };

    if (clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          settings: true,
          tier: true,
        },
      });

      if (clinic) {
        const clinicSettings = this.toRecord(clinic.settings);

        return {
          ...baseConfig,
          clinicSettings: {
            consultationFee: this.readNumber(
              clinicSettings,
              'consultationFee',
              DEFAULT_CONSULTATION_FEE,
            ),
            currency: this.readString(
              clinicSettings,
              'currency',
              DEFAULT_CURRENCY,
            ),
            timezone: this.readString(
              clinicSettings,
              'timezone',
              DEFAULT_TIMEZONE,
            ),
            appointmentDuration: this.readNumber(
              clinicSettings,
              'appointmentDuration',
              DEFAULT_APPOINTMENT_DURATION,
            ),
          },
        };
      }
    }

    return baseConfig;
  }

  validateOption(
    optionType: keyof ReturnType<typeof this.getFormOptions>,
    value: string,
  ): boolean {
    const options = this.getFormOptions()[optionType];
    return options.some((opt) => opt.value === value);
  }
}

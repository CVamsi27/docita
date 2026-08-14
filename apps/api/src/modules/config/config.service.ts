import { Inject, Injectable } from '@nestjs/common';
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
import {
  CLINIC_CONFIG_QUERY_TOKEN,
  IClinicConfigQuery,
} from './core/clinic-config-query.port';

@Injectable()
export class ConfigService {
  // jscpd:ignore-start
  constructor(
    @Inject(CLINIC_CONFIG_QUERY_TOKEN)
    private readonly clinicConfigQuery: IClinicConfigQuery,
  ) {}

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
    // jscpd:ignore-end
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
      const clinic = await this.clinicConfigQuery.findAppConfigById(clinicId);

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
            clinicType: this.readString(clinicSettings, 'clinicType', ''),
            facilityLabel: this.readString(
              clinicSettings,
              'facilityLabel',
              'CLINIC',
            ),
            sidebarNavOrder:
              typeof clinicSettings['sidebarNavOrder'] === 'object'
                ? clinicSettings['sidebarNavOrder']
                : undefined,
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

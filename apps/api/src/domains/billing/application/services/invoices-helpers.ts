import { HospitalRole, Specialization } from '@workspace/db';
import {
  invoiceItemSchema,
  invoiceTaxSummarySchema,
  taxRegistrationSnapshotSchema,
  taxSettingsSchema,
  DEFAULT_TAX_COUNTRY_CODE,
  DEFAULT_TAX_REGIME,
  extractStateCodeFromGstin,
  type InvoiceItem,
  type InvoiceTaxSummary,
  type JsonValue,
  type TaxRegistrationSnapshot,
  type TaxSettings,
} from '@workspace/types';
import { toPrismaJson } from '@/domains/billing/core/utils/invoice-normalization';
import { getClinicGstin } from '@workspace/utils';
import {
  validateHospitalRole,
  validateSpecialization,
} from '@/domains/billing/application/services/enum-validators';

// ── Constants ──────────────────────────────────────────────────────────────────

export const CURRENT_PDF_TEMPLATE_VERSION = 1;
export const DEFAULT_INVOICE_DUE_DAYS = 30;

// ── JSON helpers ───────────────────────────────────────────────────────────────

type JsonObject = { [key: string]: JsonValue | undefined };

const isJsonObject = (
  value: JsonValue | null | undefined,
): value is JsonObject =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readJsonString = (
  object: JsonObject | undefined,
  key: string,
): string | undefined => {
  const value = object?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

// ── Tax helpers ────────────────────────────────────────────────────────────────

export const parseTaxSettings = (
  settings: JsonValue | null | undefined,
): TaxSettings => {
  const settingsObject = isJsonObject(settings) ? settings : undefined;
  const rawTaxSettings = settingsObject?.taxSettings;
  const taxSettingsObject = isJsonObject(rawTaxSettings)
    ? rawTaxSettings
    : undefined;

  return taxSettingsSchema.parse({
    countryCode: DEFAULT_TAX_COUNTRY_CODE,
    regime: DEFAULT_TAX_REGIME,
    registrationId: readJsonString(settingsObject, 'gstin'),
    ...taxSettingsObject,
  });
};

export const parseTaxRegistrationSnapshot = (
  value: JsonValue | null,
): TaxRegistrationSnapshot | undefined => {
  const parsed = taxRegistrationSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const parseInvoiceTaxSummary = (
  value: JsonValue | null,
): InvoiceTaxSummary | undefined => {
  const parsed = invoiceTaxSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const extractGstinStateCode = extractStateCodeFromGstin;

export const extractClinicGstin = (
  clinic:
    | {
        settings?: JsonValue | null;
      }
    | null
    | undefined,
): string | undefined => {
  if (!clinic) return undefined;
  return getClinicGstin(clinic.settings);
};

// ── Invoice item helpers ───────────────────────────────────────────────────────

export const toPrismaInvoiceItems = (
  items: InvoiceItem[],
): ReturnType<typeof toPrismaJson> => {
  const parsedItems = invoiceItemSchema.array().parse(items);
  return toPrismaJson(parsedItems);
};

export const parseInvoiceItems = (items: JsonValue): InvoiceItem[] => {
  const parsed = invoiceItemSchema.array().safeParse(items);
  return parsed.success ? parsed.data : [];
};

// ── Enum normalizers ───────────────────────────────────────────────────────────

export const normalizeSpecialization = (
  value?: string | null,
): Specialization | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return validateSpecialization(value) ?? undefined;
};

export const normalizeDoctorRole = (
  value?: string | null,
): HospitalRole | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return validateHospitalRole(value) ?? undefined;
};

// ── Date helpers ───────────────────────────────────────────────────────────────

export const addDays = (date: Date, days: number): Date => {
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
};

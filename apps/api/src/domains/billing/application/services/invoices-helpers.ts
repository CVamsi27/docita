import { Prisma, HospitalRole, Specialization } from '@workspace/db';
import {
  invoiceItemSchema,
  invoiceTaxSummarySchema,
  taxRegistrationSnapshotSchema,
  taxSettingsSchema,
  type InvoiceItem,
  type InvoiceTaxSummary,
  type TaxRegistrationSnapshot,
  type TaxSettings,
} from '@workspace/types';
import { toPrismaJson } from '@/domains/billing/core/utils/invoice-normalization';
import {
  validateHospitalRole,
  validateSpecialization,
} from '@/domains/billing/application/services/enum-validators';

// ── Constants ──────────────────────────────────────────────────────────────────

export const CURRENT_PDF_TEMPLATE_VERSION = 1;
export const PDF_SIGNED_URL_TTL_SECONDS = 3600;
export const DEFAULT_INVOICE_DUE_DAYS = 30;

// ── JSON helpers ───────────────────────────────────────────────────────────────

const isJsonObject = (
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readJsonString = (
  object: Prisma.JsonObject | undefined,
  key: string,
): string | undefined => {
  const value = object?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

// ── Tax helpers ────────────────────────────────────────────────────────────────

export const parseTaxSettings = (
  settings: Prisma.JsonValue | null | undefined,
): TaxSettings => {
  const settingsObject = isJsonObject(settings) ? settings : undefined;
  const rawTaxSettings = settingsObject?.taxSettings;
  const taxSettingsObject = isJsonObject(rawTaxSettings)
    ? rawTaxSettings
    : undefined;

  return taxSettingsSchema.parse({
    countryCode: 'IN',
    regime: 'IN_GST',
    registrationId: readJsonString(settingsObject, 'gstin'),
    ...taxSettingsObject,
  });
};

export const parseTaxRegistrationSnapshot = (
  value: Prisma.JsonValue | null,
): TaxRegistrationSnapshot | undefined => {
  const parsed = taxRegistrationSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const parseInvoiceTaxSummary = (
  value: Prisma.JsonValue | null,
): InvoiceTaxSummary | undefined => {
  const parsed = invoiceTaxSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const extractGstinStateCode = (gstin?: string): string | undefined => {
  const stateCode = gstin?.slice(0, 2);
  return stateCode && /^\d{2}$/.test(stateCode) ? stateCode : undefined;
};

export const extractClinicGstin = (
  clinic:
    | {
        gstin?: string | null;
        settings?: Prisma.JsonValue | null;
      }
    | null
    | undefined,
): string | undefined => {
  if (!clinic) return undefined;
  if (clinic.gstin) return clinic.gstin;

  const settings = clinic.settings;
  if (!isJsonObject(settings)) {
    return undefined;
  }

  const gstin = readJsonString(settings, 'gstin');
  if (gstin) {
    return gstin;
  }

  const taxSettings = isJsonObject(settings.taxSettings)
    ? settings.taxSettings
    : undefined;
  return readJsonString(taxSettings, 'registrationId');
};

// ── Invoice item helpers ───────────────────────────────────────────────────────

export const toPrismaInvoiceItems = (
  items: InvoiceItem[],
): Prisma.InputJsonValue => {
  const parsedItems = invoiceItemSchema.array().parse(items);
  return toPrismaJson(parsedItems);
};

export const parseInvoiceItems = (items: Prisma.JsonValue): InvoiceItem[] => {
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

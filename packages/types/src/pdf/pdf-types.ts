// ─── Theme ───────────────────────────────────────────────────────────────────

export interface PDFTheme {
  primaryColor: string;       // Header band, table headers, total row bg
  primaryTextColor: string;   // Text on primary-color backgrounds
  primaryLightColor: string;  // Subtle text on primary (contact info, sublines)
  accentColor: string;        // Section left-accent bars, Rx symbol
  altRowColor: string;        // Alternating row tint in tables
  titleBgColor: string;       // Document title row background
  titleTextColor: string;     // Document title text + section header labels
}

export const DEFAULT_PDF_THEME: PDFTheme = {
  primaryColor: '#1e3a8a',
  primaryTextColor: '#ffffff',
  primaryLightColor: '#bfdbfe',
  accentColor: '#2563eb',
  altRowColor: '#f0f4ff',
  titleBgColor: '#eff6ff',
  titleTextColor: '#1e40af',
};

export function extractPdfTheme(branding: unknown): Partial<PDFTheme> | undefined {
  if (!branding || typeof branding !== 'object' || Array.isArray(branding)) {
    return undefined;
  }
  const b = branding as Record<string, unknown>;
  const theme: Partial<PDFTheme> = {};
  if (typeof b.primaryColor === 'string') theme.primaryColor = b.primaryColor;
  if (typeof b.primaryTextColor === 'string') theme.primaryTextColor = b.primaryTextColor;
  if (typeof b.primaryLightColor === 'string') theme.primaryLightColor = b.primaryLightColor;
  if (typeof b.accentColor === 'string') theme.accentColor = b.accentColor;
  if (typeof b.altRowColor === 'string') theme.altRowColor = b.altRowColor;
  if (typeof b.titleBgColor === 'string') theme.titleBgColor = b.titleBgColor;
  if (typeof b.titleTextColor === 'string') theme.titleTextColor = b.titleTextColor;
  return Object.keys(theme).length > 0 ? theme : undefined;
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '\u20B9', USD: '$',    GBP: '\u00A3', EUR: '\u20AC', AED: '\u062F.\u0625',
  SGD: 'S$',     AUD: 'A$',  CAD: 'C$',     JPY: '\u00A5', CNY: '\u00A5',
  NZD: 'NZ$',    CHF: 'Fr',  SEK: 'kr',     NOK: 'kr',     DKK: 'kr',
  MXN: '$',      BRL: 'R$',  ZAR: 'R',      NGN: '\u20A6', KES: 'KSh',
  PKR: '\u20A8', BDT: '\u09F3', LKR: 'Rs',  MYR: 'RM',     THB: '\u0E3F',
  PHP: '\u20B1', IDR: 'Rp',  VND: '\u20AB', KRW: '\u20A9', HKD: 'HK$',
  SAR: '\uFDFC', QAR: '\uFDFC', KWD: 'KD',  BHD: 'BD',     OMR: 'OMR',
};

export const COUNTRY_CURRENCY: Record<string, string> = {
  IN: 'INR', US: 'USD', GB: 'GBP', AE: 'AED', SG: 'SGD',
  AU: 'AUD', CA: 'CAD', JP: 'JPY', CN: 'CNY', NZ: 'NZD',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', MX: 'MXN',
  BR: 'BRL', ZA: 'ZAR', NG: 'NGN', KE: 'KES', PK: 'PKR',
  BD: 'BDT', LK: 'LKR', MY: 'MYR', TH: 'THB', PH: 'PHP',
  ID: 'IDR', VN: 'VND', KR: 'KRW', HK: 'HKD', SA: 'SAR',
  QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
};

export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] ?? currencyCode;
}

export function resolveCurrencySymbol(clinic: {
  currency?: string | null;
  country?: string | null;
}): string {
  if (clinic.currency) return getCurrencySymbol(clinic.currency);
  if (clinic.country) {
    const code = COUNTRY_CURRENCY[clinic.country.toUpperCase()];
    if (code) return getCurrencySymbol(code);
  }
  return getCurrencySymbol('INR');
}

// ─── Hospital code config ──────────────────────────────────────────────────────

export interface PDFCodeOverrides {
  // Maps standard ICD code (e.g. "I10") → hospital preferred code
  icd?: Record<string, string>;
  // Maps service description → hospital CPT code
  cpt?: Record<string, string>;
}

export interface PDFHospitalConfig {
  theme?: Partial<PDFTheme>;
  codeOverrides?: PDFCodeOverrides;
  // Code system label shown in PDF: 'ICD-10', 'ICD-11', 'custom', etc.
  codeSystem?: string;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface PDFClinicInfo {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  logo?: Buffer | string;
  registrationNumber?: string;
  gstin?: string;
  website?: string;
  // Localisation
  currency?: string;    // ISO 4217 e.g. 'INR', 'USD', 'GBP'
  country?: string;     // ISO 3166-1 alpha-2 e.g. 'IN', 'US', 'GB'
  // Branding – stored in clinic.branding JSON, extracted via extractPdfTheme()
  branding?: Partial<PDFTheme>;
}

export interface PDFDoctorInfo {
  name: string;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  specialization?: string;
  signatureUrl?: string;
  councilName?: string;
}

export interface PDFPatientInfo {
  name: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  gender?: string;
  age?: number;
  dateOfBirth?: Date;
  bloodGroup?: string;
  patientId?: string;
  allergies?: string[];
  weight?: number;
  height?: number;
}

export interface PDFDiagnosis {
  icdCode?: string;      // e.g. 'I10'
  description?: string;  // e.g. 'Essential hypertension'
  version?: string;      // 'ICD-10' | 'ICD-11'
  isPrimary?: boolean;
}

export interface PDFMedicationInfo {
  name: string;
  genericName?: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  timing?: string;
  specialInstructions?: string;
  quantity?: number;
}

export interface PDFInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  hsnCode?: string;   // Indian GST HSN/SAC code
  cptCode?: string;   // CPT code for insurance billing
  gstRate?: number;
}

export interface TableColumn {
  header: string;
  key: string;
  width: number;
  align?: "left" | "center" | "right";
}

export type PDFDocumentType = "prescription" | "invoice" | "report" | "receipt";

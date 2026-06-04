import {
  extractPdfTheme,
  type JsonValue,
  type PDFClinicInfo,
  type TaxRegistrationSnapshot,
} from '@workspace/types';
import { extractClinicGstin } from './invoices-helpers';

export function buildPdfClinicInfo(
  clinic: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    currency: string | null;
    branding: JsonValue | null;
    settings?: JsonValue | null;
  },
  sellerTaxSnapshot: TaxRegistrationSnapshot | undefined,
): PDFClinicInfo {
  return {
    name: clinic.name,
    address: clinic.address || undefined,
    phone: clinic.phone || undefined,
    email: clinic.email || undefined,
    logo: clinic.logo || undefined,
    currency: clinic.currency || undefined,
    branding: extractPdfTheme(clinic.branding),
    gstin: sellerTaxSnapshot?.registrationId ?? extractClinicGstin(clinic),
  };
}

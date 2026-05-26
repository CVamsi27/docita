import {
  ClinicTier,
  IntelligenceAddon,
  InvoiceStatus,
  Prisma,
} from '@workspace/db';

export interface ClinicFeatureContext {
  tier: ClinicTier;
  intelligenceAddon: IntelligenceAddon;
  features: unknown;
}

export interface InvoiceListItem {
  id: string;
  clinicId: string | null;
  invoiceNumber: string | null;
  invoiceType: string;
  currency: string;
  total: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  status: InvoiceStatus;
  items: Prisma.JsonValue;
  issuedAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  } | null;
}

export interface InvoiceDetail {
  id: string;
  patientId: string;
  clinicId: string | null;
  invoiceNumber: string | null;
  invoiceType: string;
  currency: string;
  total: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  taxSummary: Prisma.JsonValue | null;
  sellerTaxSnapshot: Prisma.JsonValue | null;
  buyerTaxSnapshot: Prisma.JsonValue | null;
  placeOfSupplyStateCode: string | null;
  placeOfSupplyStateName: string | null;
  reverseCharge: boolean;
  issuedAt: Date | null;
  dueDate: Date | null;
  eInvoiceRequired: boolean;
  eInvoiceIrn: string | null;
  eInvoiceQrCode: string | null;
  eInvoiceAcknowledgedAt: Date | null;
  status: InvoiceStatus;
  items: Prisma.JsonValue;
  doctorName: string | null;
  doctorEmail: string | null;
  doctorPhone: string | null;
  doctorSpecialization: string | null;
  doctorRegistrationNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  pdfUrl: string | null;
  pdfGeneratedAt: Date | null;
  pdfTemplateVersion: number;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    email: string | null;
    address: string | null;
    clinic?: {
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
      email: string | null;
      logo: string | null;
      currency: string | null;
      branding: Prisma.JsonValue | null;
      slaSignatureUrl?: string | null;
      gstin?: string | null;
      settings?: Prisma.JsonValue | null;
    };
  } | null;
  appointment?: {
    id: string;
    startTime: Date;
    doctor?: {
      id?: string;
      name: string;
      qualification: string | null;
      registrationNumber: string | null;
    };
    diagnoses?: Array<{
      isPrimary: boolean;
      icdCode: { code: string; description: string; version: string } | null;
    }>;
    procedures?: Array<{
      description: string;
      cptCode: { code: string; description: string } | null;
    }>;
  } | null;
}

/** Repository row including optional normalized `InvoiceItem` children. */
export type InvoiceDetailRecord = InvoiceDetail & {
  lineItems?: InvoiceLineItemRow[];
};

export interface PatientInvoiceContext {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  clinicId: string;
  clinic: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    currency: string | null;
    settings: Prisma.JsonValue | null;
  };
}

export interface InvoiceSearchParams {
  clinicId: string;
  patientId?: string;
  status?: string;
  date?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export interface IInvoiceRepository {
  findAll(
    params: InvoiceSearchParams,
  ): Promise<PaginatedResult<InvoiceListItem>>;
  findById(id: string, clinicId: string): Promise<InvoiceDetailRecord | null>;
  /**
   * Lookup by id without a tenant filter. Intentionally not clinic-scoped
   * because provider webhooks deliver the invoice id without tenant context
   * (same precedent as `IPaymentSessionRepository.findByProviderSessionId`).
   * Callers MUST verify the resolved `clinicId` against the action they are
   * about to perform before mutating any related state.
   */
  findByIdUnscoped(id: string): Promise<InvoiceDetailRecord | null>;
  create(data: Prisma.InvoiceCreateInput): Promise<InvoiceDetailRecord>;
  update(
    id: string,
    data: Prisma.InvoiceUpdateInput,
    clinicId: string,
  ): Promise<InvoiceDetailRecord>;
  delete(id: string, clinicId: string): Promise<void>;
  findPatientContext(
    patientId: string,
    clinicId?: string,
  ): Promise<PatientInvoiceContext | null>;
  findClinicFeatureContext(
    clinicId: string,
  ): Promise<ClinicFeatureContext | null>;
  nextInvoiceNumber(
    clinicId: string,
    issuedAt: Date,
    prefix?: string,
  ): Promise<string>;
}

export const INVOICE_REPOSITORY_TOKEN = Symbol('IInvoiceRepository');

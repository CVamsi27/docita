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

interface InvoiceBase {
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
  totalCents: number;
  subtotalCents: number;
  discountTotalCents: number;
  taxTotalCents: number;
  grandTotalCents: number;
  amountPaidCents: number;
  status: InvoiceStatus;
  items: Prisma.JsonValue;
  issuedAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
}

export interface InvoiceListItem extends InvoiceBase {
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  } | null;
}

export interface InvoiceDetail extends InvoiceBase {
  patientId: string;
  taxSummary: Prisma.JsonValue | null;
  sellerTaxSnapshot: Prisma.JsonValue | null;
  buyerTaxSnapshot: Prisma.JsonValue | null;
  placeOfSupplyStateCode: string | null;
  placeOfSupplyStateName: string | null;
  reverseCharge: boolean;
  eInvoiceRequired: boolean;
  eInvoiceIrn: string | null;
  eInvoiceQrCode: string | null;
  eInvoiceAcknowledgedAt: Date | null;
  doctorName: string | null;
  doctorEmail: string | null;
  doctorPhone: string | null;
  doctorSpecialization: string | null;
  doctorRegistrationNumber: string | null;
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
    advanceAmountCents: number;
    advancePaymentMethod: string | null;
    advanceReference: string | null;
    advanceNotes: string | null;
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
  statuses?: InvoiceStatus[];
  // jscpd:ignore-start
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
  // jscpd:ignore-end
  findAll(
    params: InvoiceSearchParams,
  ): Promise<PaginatedResult<InvoiceListItem>>;
  /**
   * Lean tenant-scoped existence probe used by websocket subscribe paths:
   * true only when an invoice with `id` belongs to `clinicId` (direct
   * clinicId — authoritative, set at creation from the patient's clinic —
   * or legacy null-clinicId patient fallback). Avoids loading the full
   * InvoiceDetail graph just to authorize a room join.
   */
  belongsToClinic(id: string, clinicId: string): Promise<boolean>;
  findById(id: string, clinicId: string): Promise<InvoiceDetail | null>;
  findByIdempotencyKey?(
    key: string,
    clinicId?: string,
  ): Promise<InvoiceDetail | null>;
  create(
    data: Prisma.InvoiceCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceDetail>;
  update(
    id: string,
    data: Prisma.InvoiceUpdateInput,
    clinicId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceDetail>;
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

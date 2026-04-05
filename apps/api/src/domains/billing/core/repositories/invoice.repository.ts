import { InvoiceStatus, Prisma } from '@workspace/db';

export interface InvoiceListItem {
  id: string;
  total: number;
  status: InvoiceStatus;
  items: Prisma.JsonValue;
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
  total: number;
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
  findById(id: string): Promise<InvoiceDetail | null>;
  create(data: Prisma.InvoiceCreateInput): Promise<InvoiceDetail>;
  update(id: string, data: Prisma.InvoiceUpdateInput): Promise<InvoiceDetail>;
  delete(id: string): Promise<void>;
}

export const INVOICE_REPOSITORY_TOKEN = Symbol('IInvoiceRepository');

import { Invoice, Prisma } from '@workspace/db';

export interface InvoiceDetail extends Invoice {
  patient?: {
    id: string;
    clinicId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
    address: string | null;
    clinic?: {
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
      email: string | null;
      gstin: string | null;
    };
  };
  appointment?: {
    doctor?: {
      name: string;
      qualification: string | null;
      registrationNumber: string | null;
    };
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
  findAll(params: InvoiceSearchParams): Promise<PaginatedResult<Invoice>>;
  findById(id: string): Promise<InvoiceDetail | null>;
  create(data: Prisma.InvoiceCreateInput): Promise<InvoiceDetail>;
  update(id: string, data: Prisma.InvoiceUpdateInput): Promise<InvoiceDetail>;
  delete(id: string): Promise<void>;
}

export const INVOICE_REPOSITORY_TOKEN = Symbol('IInvoiceRepository');

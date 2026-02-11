import { Invoice, Prisma } from '@workspace/db';

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
  findById(id: string): Promise<Invoice | null>;
  create(data: Prisma.InvoiceCreateInput): Promise<Invoice>;
  update(id: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice>;
  delete(id: string): Promise<void>;
}

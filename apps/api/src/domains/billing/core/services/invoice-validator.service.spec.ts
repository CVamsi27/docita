import { describe, expect, it } from '@jest/globals';
import { InvoiceValidatorService } from './invoice-validator.service';
import type { Invoice } from '@/domains/billing/core/entities/invoice.entity';
import type { InvoiceItem } from '@/domains/billing/core/entities/invoice-item.entity';

const service = new InvoiceValidatorService();

function makeItem(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    description: 'Consultation',
    quantity: 1,
    taxRate: 0,
    discount: 0,
    ...overrides,
  } as unknown as InvoiceItem;
}

function makeInvoice(overrides: {
  items?: InvoiceItem[];
  total?: number;
  totalThrows?: boolean;
  issueDate?: Date;
  dueDate?: Date;
  canBeEdited?: boolean;
  status?: string;
}): Invoice {
  const items = overrides.items ?? [makeItem()];
  return {
    getItems: () => items,
    getTotal: () => {
      if (overrides.totalThrows) throw new Error('boom');
      return { amount: overrides.total ?? 100 };
    },
    issueDate: overrides.issueDate ?? new Date('2026-07-01'),
    dueDate: overrides.dueDate ?? new Date('2026-07-15'),
    canBeEdited: () => overrides.canBeEdited ?? true,
    getStatus: () => ({ value: overrides.status ?? 'DRAFT' }),
  } as unknown as Invoice;
}

describe('InvoiceValidatorService.validateInvoice', () => {
  it('accepts a well-formed invoice', () => {
    const result = service.validateInvoice(makeInvoice({}));
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('requires at least one item', () => {
    const result = service.validateInvoice(makeInvoice({ items: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invoice must have at least one item');
  });

  it('flags a non-positive quantity with the item index', () => {
    const result = service.validateInvoice(
      makeInvoice({ items: [makeItem({ quantity: 0 })] }),
    );
    expect(result.errors).toContain('Item 1: Quantity must be greater than 0');
  });

  it('requires an item description', () => {
    const result = service.validateInvoice(
      makeInvoice({ items: [makeItem({ description: '   ' })] }),
    );
    expect(result.errors).toContain('Item 1: Description is required');
  });

  it('bounds tax rate and discount to 0–100', () => {
    const result = service.validateInvoice(
      makeInvoice({ items: [makeItem({ taxRate: 120, discount: -5 })] }),
    );
    expect(result.errors[0]).toContain('Tax rate must be between 0 and 100');
    expect(result.errors[0]).toContain('Discount must be between 0 and 100');
  });

  it('rejects an issue date after the due date', () => {
    const result = service.validateInvoice(
      makeInvoice({
        issueDate: new Date('2026-07-20'),
        dueDate: new Date('2026-07-15'),
      }),
    );
    expect(result.errors).toContain('Issue date must be before due date');
  });

  it('rejects a non-positive total', () => {
    const result = service.validateInvoice(makeInvoice({ total: 0 }));
    expect(result.errors).toContain('Invoice total must be greater than 0');
  });

  it('captures a total-calculation failure instead of throwing', () => {
    const result = service.validateInvoice(makeInvoice({ totalThrows: true }));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.startsWith('Error calculating total')),
    ).toBe(true);
  });
});

describe('InvoiceValidatorService.validateCanIssueInvoice', () => {
  it('allows issuing a valid, editable invoice', () => {
    const result = service.validateCanIssueInvoice(makeInvoice({}));
    expect(result).toEqual({ canIssue: true, errors: [] });
  });

  it('blocks issuing when the invoice cannot be edited from its status', () => {
    const result = service.validateCanIssueInvoice(
      makeInvoice({ canBeEdited: false, status: 'PAID' }),
    );
    expect(result.canIssue).toBe(false);
    expect(result.errors).toContain(
      'Invoice cannot be issued from status: PAID',
    );
  });
});

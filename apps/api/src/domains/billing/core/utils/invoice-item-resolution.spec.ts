import {
  lineItemRowToInvoiceItem,
  parseInvoiceItemsFromJson,
  resolveInvoiceItems,
} from './invoice-item-resolution';

describe('invoice-item-resolution', () => {
  it('falls back to JSON items when lineItems are empty', () => {
    const items = [
      {
        description: 'Consultation',
        quantity: 1,
        price: 500,
      },
    ];

    expect(
      resolveInvoiceItems({
        items,
        lineItems: [],
      }),
    ).toEqual(parseInvoiceItemsFromJson(items));
  });

  it('prefers lineItems over legacy JSON', () => {
    const resolved = resolveInvoiceItems({
      items: [{ description: 'Stale', quantity: 1, price: 1 }],
      lineItems: [
        {
          id: 'line-1',
          description: 'Procedure',
          code: '99213',
          sourceType: 'CPT',
          quantity: 1,
          unitPriceCents: 150_00,
          discountCents: 0,
          taxRateBps: 1800,
          taxCents: 27_00,
          totalCents: 177_00,
          hsnSac: null,
          metadata: null,
        },
      ],
    });

    expect(resolved[0]?.description).toBe('Procedure');
    expect(resolved[0]?.unitPrice).toBe(150);
    expect(resolved[0]?.cptCode).toBe('99213');
  });

  it('restores full item from metadata when present', () => {
    const item = lineItemRowToInvoiceItem({
      id: 'line-2',
      description: 'Fallback label',
      code: null,
      sourceType: null,
      quantity: 2,
      unitPriceCents: 100_00,
      discountCents: 10_00,
      taxRateBps: 500,
      taxCents: 5_00,
      totalCents: 195_00,
      hsnSac: null,
      metadata: {
        description: 'From metadata',
        quantity: 2,
        price: 100,
        taxTreatment: 'TAXABLE',
      },
    });

    expect(item.description).toBe('From metadata');
    expect(item.taxTreatment).toBe('TAXABLE');
  });
});

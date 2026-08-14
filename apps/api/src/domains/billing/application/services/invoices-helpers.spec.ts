import {
  parseTaxSettings,
  parseTaxRegistrationSnapshot,
  parseInvoiceTaxSummary,
  extractClinicGstin,
  parseInvoiceItems,
  normalizeSpecialization,
  normalizeDoctorRole,
  addDays,
  CURRENT_PDF_TEMPLATE_VERSION,
  DEFAULT_INVOICE_DUE_DAYS,
} from './invoices-helpers';

describe('constants', () => {
  it('CURRENT_PDF_TEMPLATE_VERSION is 1', () => {
    expect(CURRENT_PDF_TEMPLATE_VERSION).toBe(1);
  });

  it('DEFAULT_INVOICE_DUE_DAYS is 30', () => {
    expect(DEFAULT_INVOICE_DUE_DAYS).toBe(30);
  });
});

describe('parseTaxSettings', () => {
  it('returns default tax settings for null input', () => {
    const result = parseTaxSettings(null);
    expect(result.countryCode).toBe('IN');
    expect(result.regime).toBe('IN_GST');
  });

  it('returns default tax settings for undefined input', () => {
    const result = parseTaxSettings(undefined);
    expect(result.countryCode).toBe('IN');
    expect(result.regime).toBe('IN_GST');
  });

  it('extracts gstin from settings.gstin', () => {
    const settings = { gstin: '27AABCU9603R1ZM' };
    const result = parseTaxSettings(settings);
    expect(result.registrationId).toBe('27AABCU9603R1ZM');
  });

  it('extracts registrationId from settings.taxSettings', () => {
    const settings = {
      taxSettings: { registrationId: '27XYZAB1234C1Z5' },
    };
    const result = parseTaxSettings(settings);
    expect(result.registrationId).toBe('27XYZAB1234C1Z5');
  });

  it('taxSettings overrides gstin when both present', () => {
    const settings = {
      gstin: '27OLD',
      taxSettings: { registrationId: '27NEW' },
    };
    const result = parseTaxSettings(settings);
    expect(result.registrationId).toBe('27NEW');
  });

  it('handles non-object settings gracefully', () => {
    const result = parseTaxSettings('not-an-object');
    expect(result.countryCode).toBe('IN');
    expect(result.regime).toBe('IN_GST');
  });

  it('handles settings with non-object taxSettings', () => {
    const settings = { taxSettings: 'invalid' };
    const result = parseTaxSettings(settings);
    expect(result.countryCode).toBe('IN');
  });
});

describe('parseTaxRegistrationSnapshot', () => {
  it('returns parsed snapshot for valid input', () => {
    const input = {
      countryCode: 'IN',
      regime: 'IN_GST',
      registrationId: '27AABCU9603R1ZM',
    };
    const result = parseTaxRegistrationSnapshot(input);
    expect(result).toBeDefined();
    expect(result?.countryCode).toBe('IN');
    expect(result?.regime).toBe('IN_GST');
    expect(result?.registrationId).toBe('27AABCU9603R1ZM');
  });

  it('returns parsed snapshot for minimal valid input', () => {
    const result = parseTaxRegistrationSnapshot({ invalid: true });
    expect(result).toBeDefined();
  });

  it('returns undefined for null input', () => {
    expect(parseTaxRegistrationSnapshot(null)).toBeUndefined();
  });

  it('applies defaults for missing optional fields', () => {
    const result = parseTaxRegistrationSnapshot({});
    expect(result).toBeDefined();
    expect(result?.countryCode).toBe('IN');
    expect(result?.regime).toBe('IN_GST');
  });
});

describe('parseInvoiceTaxSummary', () => {
  it('returns parsed summary for valid input', () => {
    const input = {
      countryCode: 'IN',
      regime: 'IN_GST',
      currency: 'INR',
      subtotal: 1000,
      grandTotal: 1180,
    };
    const result = parseInvoiceTaxSummary(input);
    expect(result).toBeDefined();
    expect(result?.subtotal).toBe(1000);
    expect(result?.grandTotal).toBe(1180);
  });

  it('returns undefined for null input', () => {
    expect(parseInvoiceTaxSummary(null)).toBeUndefined();
  });

  it('returns undefined for invalid input missing required fields', () => {
    expect(parseInvoiceTaxSummary({ random: 'data' })).toBeUndefined();
  });

  it('applies defaults for optional fields', () => {
    const input = { subtotal: 100, grandTotal: 100 };
    const result = parseInvoiceTaxSummary(input);
    expect(result).toBeDefined();
    expect(result?.countryCode).toBe('IN');
    expect(result?.regime).toBe('IN_GST');
    expect(result?.currency).toBe('INR');
    expect(result?.discountTotal).toBe(0);
    expect(result?.taxTotal).toBe(0);
    expect(result?.components).toEqual([]);
  });
});

describe('extractClinicGstin', () => {
  it('returns gstin from settings.gstin', () => {
    const clinic = { settings: { gstin: '27AABCU9603R1ZM' } };
    expect(extractClinicGstin(clinic)).toBe('27AABCU9603R1ZM');
  });

  it('returns registrationId from settings.taxSettings', () => {
    const clinic = {
      settings: { taxSettings: { registrationId: '27XYZAB1234C1Z5' } },
    };
    expect(extractClinicGstin(clinic)).toBe('27XYZAB1234C1Z5');
  });

  it('returns undefined for null clinic', () => {
    expect(extractClinicGstin(null)).toBeUndefined();
  });

  it('returns undefined for undefined clinic', () => {
    expect(extractClinicGstin(undefined)).toBeUndefined();
  });

  it('returns undefined for clinic with no settings', () => {
    expect(extractClinicGstin({})).toBeUndefined();
  });

  it('returns undefined for clinic with null settings', () => {
    expect(extractClinicGstin({ settings: null })).toBeUndefined();
  });
});

describe('parseInvoiceItems', () => {
  it('parses valid invoice items', () => {
    const items = [{ description: 'Consultation', quantity: 1, price: 500 }];
    const result = parseInvoiceItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Consultation');
    expect(result[0].quantity).toBe(1);
    expect(result[0].price).toBe(500);
  });

  it('returns empty array for invalid items', () => {
    const result = parseInvoiceItems([{ invalid: true }]);
    expect(result).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(parseInvoiceItems('not-an-array')).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(parseInvoiceItems([])).toEqual([]);
  });

  it('returns empty array when any item fails validation', () => {
    const items = [
      { description: 'Valid', quantity: 1, price: 100 },
      { invalid: true },
    ];
    const result = parseInvoiceItems(items);
    expect(result).toEqual([]);
  });
});

describe('normalizeSpecialization', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeSpecialization(undefined)).toBeUndefined();
  });

  it('returns null for null input', () => {
    expect(normalizeSpecialization(null)).toBeNull();
  });

  it('returns validated specialization for valid input', () => {
    const result = normalizeSpecialization('CARDIOLOGY');
    expect(result).toBeDefined();
  });

  it('returns undefined for invalid specialization', () => {
    const result = normalizeSpecialization('NOT_A_SPECIALIZATION');
    expect(result).toBeUndefined();
  });
});

describe('normalizeDoctorRole', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeDoctorRole(undefined)).toBeUndefined();
  });

  it('returns null for null input', () => {
    expect(normalizeDoctorRole(null)).toBeNull();
  });

  it('returns validated role for a valid HospitalRole value', () => {
    const result = normalizeDoctorRole('CONSULTANT');
    expect(result).toBe('CONSULTANT');
  });

  it('returns undefined for invalid role', () => {
    const result = normalizeDoctorRole('NOT_A_ROLE');
    expect(result).toBeUndefined();
  });
});

describe('addDays', () => {
  it('adds days to a date', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const result = addDays(date, 5);
    expect(result.getDate()).toBe(20);
    expect(result.getMonth()).toBe(0);
  });

  it('does not mutate the original date', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    addDays(date, 10);
    expect(date.getDate()).toBe(15);
  });

  it('handles negative days', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const result = addDays(date, -5);
    expect(result.getDate()).toBe(10);
  });

  it('handles zero days', () => {
    const date = new Date('2026-01-15T12:00:00.000Z');
    const result = addDays(date, 0);
    expect(result.toISOString()).toBe(date.toISOString());
  });

  it('handles month boundaries', () => {
    const date = new Date('2026-01-30T00:00:00.000Z');
    const result = addDays(date, 5);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(4);
  });
});

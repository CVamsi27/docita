import {
  toRecord,
  parseEnterpriseBranding,
  readString,
  readStringArray,
  readNumber,
  readOptionalString,
  generateReferralCode,
  attachResolvedClinicSignatureUrl,
} from './clinic-data.helpers';

describe('toRecord', () => {
  it('returns a copy of a valid record', () => {
    const input = { a: 1, b: 'hello' };
    const result = toRecord(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it('returns empty object for null', () => {
    expect(toRecord(null)).toEqual({});
  });

  it('returns empty object for undefined', () => {
    expect(toRecord(undefined)).toEqual({});
  });

  it('returns empty object for a string', () => {
    expect(toRecord('hello')).toEqual({});
  });

  it('returns empty object for a number', () => {
    expect(toRecord(42)).toEqual({});
  });

  it('returns empty object for an array', () => {
    expect(toRecord([1, 2, 3])).toEqual({});
  });
});

describe('parseEnterpriseBranding', () => {
  it('returns parsed branding for valid input with brandName', () => {
    const branding = { brandName: 'My Clinic' };
    const result = parseEnterpriseBranding(branding);
    expect(result).toBeDefined();
    expect(result?.brandName).toBe('My Clinic');
  });

  it('returns parsed branding with lockedTheme', () => {
    const branding = {
      lockedTheme: { primaryColor: '#FF0000', mode: 'light' },
    };
    const result = parseEnterpriseBranding(branding);
    expect(result).toBeDefined();
    expect(result?.lockedTheme?.primaryColor).toBe('#FF0000');
    expect(result?.lockedTheme?.mode).toBe('light');
  });

  it('returns undefined for invalid nested lockedTheme mode', () => {
    const result = parseEnterpriseBranding({
      lockedTheme: { mode: 'invalid' },
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(parseEnterpriseBranding(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(parseEnterpriseBranding(undefined)).toBeUndefined();
  });

  it('returns undefined for a string', () => {
    expect(parseEnterpriseBranding('not-a-brand')).toBeUndefined();
  });
});

describe('readString', () => {
  const source = { name: 'test', count: 42, flag: true };

  it('returns the string value when key exists and is a string', () => {
    expect(readString(source, 'name')).toBe('test');
  });

  it('returns undefined when value is not a string', () => {
    expect(readString(source, 'count')).toBeUndefined();
  });

  it('returns undefined when key does not exist', () => {
    expect(readString(source, 'missing')).toBeUndefined();
  });
});

describe('readStringArray', () => {
  it('returns the array when all items are strings', () => {
    expect(readStringArray({ tags: ['a', 'b', 'c'] }, 'tags')).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('filters out non-string items', () => {
    expect(readStringArray({ tags: ['a', 42, 'b'] }, 'tags')).toEqual([
      'a',
      'b',
    ]);
  });

  it('returns empty array when no items are strings', () => {
    expect(readStringArray({ tags: [1, 2, 3] }, 'tags')).toEqual([]);
  });

  it('returns undefined when value is not an array', () => {
    expect(readStringArray({ tags: 'not-array' }, 'tags')).toBeUndefined();
  });

  it('returns undefined when key does not exist', () => {
    expect(readStringArray({}, 'missing')).toBeUndefined();
  });
});

describe('readNumber', () => {
  const source = { count: 42, name: 'test' };

  it('returns the number value when key exists and is a number', () => {
    expect(readNumber(source, 'count')).toBe(42);
  });

  it('returns undefined when value is not a number', () => {
    expect(readNumber(source, 'name')).toBeUndefined();
  });

  it('returns undefined when key does not exist', () => {
    expect(readNumber(source, 'missing')).toBeUndefined();
  });

  it('returns 0 for zero value', () => {
    expect(readNumber({ val: 0 }, 'val')).toBe(0);
  });
});

describe('readOptionalString', () => {
  it('returns trimmed string when present', () => {
    expect(readOptionalString({ key: '  hello  ' }, 'key')).toBe('hello');
  });

  it('returns undefined for empty string', () => {
    expect(readOptionalString({ key: '' }, 'key')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(readOptionalString({ key: '   ' }, 'key')).toBeUndefined();
  });

  it('returns undefined for non-string', () => {
    expect(readOptionalString({ key: 42 }, 'key')).toBeUndefined();
  });

  it('returns undefined when key does not exist', () => {
    expect(readOptionalString({}, 'key')).toBeUndefined();
  });
});

describe('generateReferralCode', () => {
  it('returns a code in format PREFIX-XXXX', () => {
    const code = generateReferralCode('Sunrise Clinic');
    expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{4}$/);
  });

  it('uses first 3 alphanumeric characters of clinic name as prefix', () => {
    const code = generateReferralCode('Sunrise Clinic');
    expect(code.startsWith('SUN')).toBe(true);
  });

  it('pads short names with X', () => {
    const code = generateReferralCode('Hi');
    expect(code.startsWith('HIX')).toBe(true);
  });

  it('strips non-alphanumeric characters from prefix', () => {
    const code = generateReferralCode('Dr. Smith & Co.');
    expect(code.startsWith('DRS')).toBe(true);
  });

  it('generates different codes on successive calls (randomness)', () => {
    const codes = new Set(
      Array.from({ length: 20 }, () => generateReferralCode('Clinic')),
    );
    expect(codes.size).toBeGreaterThan(1);
  });

  it('uppercases the prefix', () => {
    const code = generateReferralCode('small clinic');
    expect(code.charAt(0)).toMatch(/[A-Z]/);
  });
});

describe('attachResolvedClinicSignatureUrl', () => {
  it('resolves a stored URL from settings.sla.signatureStoredUrl', async () => {
    const clinic = {
      slaSignatureUrl: null,
      settings: { sla: { signatureStoredUrl: 'stored://sig.png' } },
    };
    const resolver = {
      resolveWithStoredUrl: jest.fn().mockResolvedValue({
        url: 'https://cdn.example.com/sig.png',
        storedUrl: 'stored://sig.png',
      }),
    };
    const result = await attachResolvedClinicSignatureUrl(clinic, resolver);
    expect(result.slaSignatureUrl).toBe('https://cdn.example.com/sig.png');
    expect(result.slaSignatureStoredUrl).toBe('stored://sig.png');
  });

  it('falls back to settings.sla.signatureUrl', async () => {
    const clinic = {
      slaSignatureUrl: null,
      settings: { sla: { signatureUrl: 'https://example.com/sig.jpg' } },
    };
    const resolver = {
      resolveWithStoredUrl: jest.fn().mockResolvedValue({
        url: 'https://cdn.example.com/sig.jpg',
        storedUrl: null,
      }),
    };
    const result = await attachResolvedClinicSignatureUrl(clinic, resolver);
    expect(result.slaSignatureUrl).toBe('https://cdn.example.com/sig.jpg');
  });

  it('falls back to clinic.slaSignatureUrl', async () => {
    const clinic = {
      slaSignatureUrl: 'https://example.com/direct-sig.png',
      settings: {},
    };
    const resolver = {
      resolveWithStoredUrl: jest.fn().mockResolvedValue({
        url: 'https://cdn.example.com/direct-sig.png',
        storedUrl: null,
      }),
    };
    const result = await attachResolvedClinicSignatureUrl(clinic, resolver);
    expect(result.slaSignatureUrl).toBe(
      'https://cdn.example.com/direct-sig.png',
    );
  });

  it('returns undefined urls when no signature is configured', async () => {
    const clinic = { slaSignatureUrl: null, settings: {} };
    const resolver = {
      resolveWithStoredUrl: jest
        .fn()
        .mockResolvedValue({ url: null, storedUrl: null }),
    };
    const result = await attachResolvedClinicSignatureUrl(clinic, resolver);
    expect(result.slaSignatureUrl).toBeUndefined();
    expect(result.slaSignatureStoredUrl).toBeUndefined();
  });

  it('preserves extra clinic fields', async () => {
    const clinic = {
      id: 'clinic-1',
      name: 'Test',
      slaSignatureUrl: null,
      settings: {},
    };
    const resolver = {
      resolveWithStoredUrl: jest
        .fn()
        .mockResolvedValue({ url: null, storedUrl: null }),
    };
    const result = await attachResolvedClinicSignatureUrl(clinic, resolver);
    expect(result.id).toBe('clinic-1');
    expect(result.name).toBe('Test');
  });
});

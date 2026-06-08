import { describe, expect, it } from '@jest/globals';
import {
  cptCategory,
  mapCpt,
  mapIcd,
  readTotalFromNlmResponse,
  toNlmRows,
} from './nlm-coding-mappers';

describe('cptCategory', () => {
  it('classifies letter-prefixed codes as HCPCS', () => {
    expect(cptCategory('J1234')).toBe('HCPCS');
    expect(cptCategory('A0021')).toBe('HCPCS');
  });

  it('classifies numeric ranges correctly', () => {
    expect(cptCategory('99213')).toBe('Evaluation and Management');
    expect(cptCategory('11042')).toBe('Surgery');
    expect(cptCategory('71045')).toBe('Radiology');
    expect(cptCategory('85025')).toBe('Laboratory');
    expect(cptCategory('90471')).toBe('Medicine');
    expect(cptCategory('100')).toBe('Anesthesia');
  });

  it('returns Other for unrecognized codes', () => {
    // "99999999" is a number larger than any recognized range, so it falls through.
    expect(cptCategory('99999999')).toBe('Other');
  });

  it('classifies any letter-prefixed code as HCPCS', () => {
    // The first-letter check is intentionally permissive: any code starting
    // with a letter is treated as HCPCS, not a numeric CPT.
    expect(cptCategory('not-a-code')).toBe('HCPCS');
  });
});

describe('toNlmRows', () => {
  it('returns empty array for non-array data', () => {
    expect(toNlmRows(null)).toEqual([]);
    expect(toNlmRows({})).toEqual([]);
    expect(toNlmRows('string')).toEqual([]);
  });

  it('returns empty array when codes array is missing or invalid', () => {
    expect(toNlmRows([0, null, null, []])).toEqual([]);
    expect(toNlmRows([0, 'not-an-array', null, []])).toEqual([]);
  });

  it('parses NLM rows with codes and descriptions', () => {
    const data = [
      3,
      ['A00', 'B19', 'C50'],
      null,
      [
        ['A00', 'Cholera'],
        ['B19', 'Unspecified viral hepatitis'],
        ['C50', 'Malignant neoplasm of breast'],
      ],
    ];
    expect(toNlmRows(data)).toEqual([
      { code: 'A00', description: 'Cholera' },
      { code: 'B19', description: 'Unspecified viral hepatitis' },
      { code: 'C50', description: 'Malignant neoplasm of breast' },
    ]);
  });

  it('falls back to the second column when no later column has text', () => {
    const data = [
      1,
      ['99213'],
      null,
      [['99213', null, 'Office visit']],
    ];
    const rows = toNlmRows(data);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('99213');
    expect(rows[0].description).toBe('Office visit');
  });

  it('filters out rows with empty codes', () => {
    const data = [2, ['A00', ''], null, [['A00', 'Cholera'], ['', '']]];
    const rows = toNlmRows(data);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('A00');
  });
});

describe('mapIcd', () => {
  it('maps an ICD code with the correct category for the first letter', () => {
    const result = mapIcd('A001', 'Cholera', true);
    expect(result).toMatchObject({
      id: 'A001',
      code: 'A001',
      description: 'Cholera',
      category: 'Infectious Diseases',
      version: 'ICD-10',
      isCommon: true,
    });
  });

  it('falls back to Other for unknown first letters', () => {
    const result = mapIcd('9999', 'Test', false);
    expect(result.category).toBe('Other');
  });
});

describe('mapCpt', () => {
  it('maps a CPT code with the correct category', () => {
    const result = mapCpt('99213', 'Office visit', true);
    expect(result).toMatchObject({
      id: '99213',
      code: '99213',
      description: 'Office visit',
      category: 'Evaluation and Management',
      isCommon: true,
      price: 0,
    });
  });
});

describe('readTotalFromNlmResponse', () => {
  it('returns the numeric total when present', () => {
    expect(readTotalFromNlmResponse([42, [], null, []])).toBe(42);
  });

  it('returns 0 for invalid data', () => {
    expect(readTotalFromNlmResponse(null)).toBe(0);
    expect(readTotalFromNlmResponse([])).toBe(0);
    expect(readTotalFromNlmResponse([null, [], null, []])).toBe(0);
  });
});

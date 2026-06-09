import {
  extractNormalizedRow,
  getCell,
  isRowEmpty,
  mapDataRows,
  sanitizeCellValue,
  toHeaderString,
  trimTrailingEmptyCells,
} from './import-row-utils';

describe('sanitizeCellValue', () => {
  it('passes through strings and numbers', () => {
    expect(sanitizeCellValue('hello')).toBe('hello');
    expect(sanitizeCellValue(42)).toBe(42);
  });

  it('handles Date instances', () => {
    const d = new Date('2026-01-15');
    expect(sanitizeCellValue(d)).toBe(d);
  });

  it('converts booleans to strings', () => {
    expect(sanitizeCellValue(true)).toBe('true');
    expect(sanitizeCellValue(false)).toBe('false');
  });

  it('returns undefined for null/undefined', () => {
    expect(sanitizeCellValue(null)).toBeUndefined();
    expect(sanitizeCellValue(undefined)).toBeUndefined();
  });

  it('converts other values to string', () => {
    expect(sanitizeCellValue(Symbol('x'))).toBe('Symbol(x)');
  });
});

describe('getCell', () => {
  it('returns the cell value when it is a string or number', () => {
    expect(getCell(['a', 'b', 'c'], 1)).toBe('b');
    expect(getCell([10, 20], 1)).toBe(20);
  });

  it('returns undefined for non-array rows', () => {
    expect(getCell(null, 0)).toBeUndefined();
    expect(getCell({}, 0)).toBeUndefined();
  });

  it('returns undefined for out-of-range index', () => {
    expect(getCell(['a'], 5)).toBeUndefined();
  });
});

describe('isRowEmpty', () => {
  it('returns true when all cells are undefined or empty', () => {
    expect(isRowEmpty([undefined, '', undefined])).toBe(true);
  });

  it('returns false when any cell has content', () => {
    expect(isRowEmpty(['a', undefined])).toBe(false);
  });
});

describe('toHeaderString', () => {
  it('returns the trimmed string', () => {
    expect(toHeaderString('  Name  ')).toBe('Name');
  });

  it('returns empty string for undefined', () => {
    expect(toHeaderString(undefined)).toBe('');
  });
});

describe('trimTrailingEmptyCells', () => {
  it('removes trailing undefined values', () => {
    const arr: Array<string | number | Date | undefined> = [
      'a',
      'b',
      undefined,
      undefined,
    ];
    trimTrailingEmptyCells(arr);
    expect(arr).toEqual(['a', 'b']);
  });

  it('removes trailing empty strings', () => {
    const arr: Array<string | number | Date | undefined> = ['a', ''];
    trimTrailingEmptyCells(arr);
    expect(arr).toEqual(['a']);
  });

  it('does not modify a non-empty array', () => {
    const arr: Array<string | number | Date | undefined> = ['a', 'b'];
    trimTrailingEmptyCells(arr);
    expect(arr).toEqual(['a', 'b']);
  });
});

describe('mapDataRows', () => {
  it('maps rows to objects keyed by headers', () => {
    const headers = ['name', 'age'];
    const data: Array<Array<string | number | Date | undefined>> = [
      ['Alice', 30],
      ['Bob', 25],
    ];
    const result = mapDataRows(headers, data);
    expect(result).toEqual([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
  });

  it('skips empty header columns', () => {
    const headers = ['name', '', 'age'];
    const data: Array<Array<string | number | Date | undefined>> = [
      ['Alice', 'ignored', 30],
    ];
    const result = mapDataRows(headers, data);
    expect(result).toEqual([{ name: 'Alice', age: 30 }]);
  });

  it('skips undefined or empty values', () => {
    const headers = ['name', 'age'];
    const data: Array<Array<string | number | Date | undefined>> = [
      ['Alice', ''],
    ];
    const result = mapDataRows(headers, data);
    expect(result).toEqual([{ name: 'Alice' }]);
  });
});

describe('extractNormalizedRow', () => {
  it('normalizes cells and trims trailing empties', () => {
    const result = extractNormalizedRow(['a', 'b', undefined, '']);
    expect(result).toEqual(['a', 'b']);
  });

  it('converts empty strings to undefined while preserving trailing non-empty cells', () => {
    const result = extractNormalizedRow(['a', '', '', 'c']);
    expect(result).toEqual(['a', undefined, undefined, 'c']);
  });

  it('trims trailing empties from the end', () => {
    const result = extractNormalizedRow(['a', '', '']);
    expect(result).toEqual(['a']);
  });
});

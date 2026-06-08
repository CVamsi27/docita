import { toPrismaInputJsonValue } from './to-prisma-input-json-value';

describe('toPrismaInputJsonValue', () => {
  it('passes through null and undefined', () => {
    expect(toPrismaInputJsonValue(null)).toBe(null);
    expect(toPrismaInputJsonValue(undefined)).toBe(undefined);
  });

  it('passes through strings, numbers, booleans', () => {
    expect(toPrismaInputJsonValue('hello')).toBe('hello');
    expect(toPrismaInputJsonValue(42)).toBe(42);
    expect(toPrismaInputJsonValue(true)).toBe(true);
    expect(toPrismaInputJsonValue(false)).toBe(false);
  });

  it('converts bigint to string', () => {
    expect(toPrismaInputJsonValue(BigInt(123))).toBe('123');
  });

  it('converts Date to ISO string', () => {
    const d = new Date('2026-06-08T00:00:00.000Z');
    expect(toPrismaInputJsonValue(d)).toBe('2026-06-08T00:00:00.000Z');
  });

  it('normalizes nested objects', () => {
    const input = { a: 1, b: 'hello', c: null };
    expect(toPrismaInputJsonValue(input)).toEqual({ a: 1, b: 'hello', c: null });
  });

  it('normalizes arrays', () => {
    const input = [1, 'two', null];
    expect(toPrismaInputJsonValue(input)).toEqual([1, 'two', null]);
  });

  it('strips undefined values from objects', () => {
    const input = { a: 1, b: undefined, c: 3 };
    expect(toPrismaInputJsonValue(input)).toEqual({ a: 1, c: 3 });
  });

  it('handles nested arrays and objects', () => {
    const input = {
      items: [{ id: 1 }, { id: 2 }],
      meta: { count: 2, tags: ['a', 'b'] },
    };
    expect(toPrismaInputJsonValue(input)).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      meta: { count: 2, tags: ['a', 'b'] },
    });
  });

  it('replaces circular references with "[Circular]"', () => {
    const obj: Record<string, unknown> = { name: 'root' };
    obj.self = obj;
    expect(toPrismaInputJsonValue(obj)).toEqual({
      name: 'root',
      self: '[Circular]',
    });
  });

  it('replaces deep circular references', () => {
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b', sibling: a };
    a.sibling = b;
    expect(toPrismaInputJsonValue(a)).toEqual({
      name: 'a',
      sibling: { name: 'b', sibling: '[Circular]' },
    });
  });
});

import { DateUtils } from './date.utils';

describe('DateUtils', () => {
  describe('format', () => {
    it('should format valid date correctly', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      expect(DateUtils.format(date, 'yyyy-MM-dd')).toBe('2023-01-01');
    });

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.format(new Date('invalid'))).toThrow();
    });
  });

  describe('addDays / subDays', () => {
    it('should add days correctly', () => {
      const date = new Date('2023-01-01');
      const result = DateUtils.addDays(date, 5);
      expect(DateUtils.format(result, 'yyyy-MM-dd')).toBe('2023-01-06');
    });

    it('should subtract days correctly', () => {
      const date = new Date('2023-01-06');
      const result = DateUtils.subDays(date, 5);
      expect(DateUtils.format(result, 'yyyy-MM-dd')).toBe('2023-01-01');
    });
  });

  describe('isFuture / isPast', () => {
    it('should detect future dates', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(DateUtils.isFuture(future)).toBe(true);
      expect(DateUtils.isPast(future)).toBe(false);
    });

    it('should detect past dates', () => {
      const past = new Date('2000-01-01');
      expect(DateUtils.isPast(past)).toBe(true);
      expect(DateUtils.isFuture(past)).toBe(false);
    });
  });
});

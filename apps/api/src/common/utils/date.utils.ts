import {
  addDays as addDaysToDate,
  formatDate,
  isFuture as isDateFuture,
  isPast as isDatePast,
  subDays as subDaysFromDate,
} from '@workspace/utils';

export class DateUtils {
  static format(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
    if (!DateUtils.isValid(date)) {
      throw new Error('Invalid date provided to DateUtils.format');
    }
    const formatted = formatDate(date, formatStr, { timezone: 'UTC' });
    if (!formatted) {
      throw new Error('Invalid date provided to DateUtils.format');
    }
    return formatted;
  }

  static addDays(date: Date, amount: number): Date {
    return addDaysToDate(date, amount);
  }

  static subDays(date: Date, amount: number): Date {
    return subDaysFromDate(date, amount);
  }

  static isFuture(date: Date): boolean {
    return isDateFuture(date);
  }

  static isPast(date: Date): boolean {
    return isDatePast(date);
  }

  static isValid(date: Date | string | number | null | undefined): boolean {
    if (date === null || date === undefined) return false;
    if (typeof date === 'number') {
      if (!Number.isFinite(date)) return false;
      const d = new Date(date);
      return !Number.isNaN(d.getTime());
    }
    if (date instanceof Date) {
      return !Number.isNaN(date.getTime());
    }
    if (typeof date === 'string') {
      const d = new Date(date);
      return !Number.isNaN(d.getTime());
    }
    return false;
  }

  static toISO(date: Date): string {
    if (!DateUtils.isValid(date)) return '';
    return date.toISOString();
  }
}

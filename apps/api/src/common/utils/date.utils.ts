import { format, addDays, subDays, isAfter, isBefore, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export class DateUtils {
  private static readonly DEFAULT_TIMEZONE = 'UTC';

  static format(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
    if (!DateUtils.isValid(date)) {
      throw new Error('Invalid date provided to DateUtils.format');
    }
    return format(date, formatStr);
  }

  static addDays(date: Date, amount: number): Date {
    return addDays(date, amount);
  }

  static subDays(date: Date, amount: number): Date {
    return subDays(date, amount);
  }

  static isFuture(date: Date): boolean {
    return isAfter(date, new Date());
  }

  static isPast(date: Date): boolean {
    return isBefore(date, new Date());
  }

  static isValid(date: Date | string | number | null | undefined): boolean {
    return isValid(date);
  }

  static toISO(date: Date): string {
    if (!DateUtils.isValid(date)) return '';
    return date.toISOString();
  }
}

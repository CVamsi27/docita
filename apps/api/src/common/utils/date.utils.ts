import { format, addDays, subDays, isAfter, isBefore, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export class DateUtils {
  private static readonly DEFAULT_TIMEZONE = 'UTC'; // Or configurable via env

  /**
   * Formats a date object to a string using the specified format.
   * Defaults to ISO format if no format string provided.
   */
  static format(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
    if (!DateUtils.isValid(date)) {
      throw new Error('Invalid date provided to DateUtils.format');
    }
    return format(date, formatStr);
  }

  /**
   * Adds specified number of days to a date.
   */
  static addDays(date: Date, amount: number): Date {
    return addDays(date, amount);
  }

  /**
   * Subtracts specified number of days from a date.
   */
  static subDays(date: Date, amount: number): Date {
    return subDays(date, amount);
  }

  /**
   * Checks if date is in the future.
   */
  static isFuture(date: Date): boolean {
    return isAfter(date, new Date());
  }

  /**
   * Checks if date is in the past.
   */
  static isPast(date: Date): boolean {
    return isBefore(date, new Date());
  }

  /**
   * Validates if a date object is valid.
   */
  static isValid(date: Date | string | number | null | undefined): boolean {
    return isValid(date);
  }

  /**
   * Converts a date to ISO string safely.
   */
  static toISO(date: Date): string {
    if (!DateUtils.isValid(date)) return '';
    return date.toISOString();
  }
}

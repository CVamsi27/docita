export class StringUtils {
  /**
   * Capitalizes the first letter of a string.
   */
  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Generates a URL-friendly slug from a string.
   */
  static slugify(str: string): string {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-'); // Replace multiple - with single -
  }

  /**
   * Basic sanitization to remove HTML tags.
   * Note: For security-critical sanitization, use a dedicated library like DOMPurify (frontend) or sanitize-html.
   */
  static sanitize(str: string): string {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '');
  }

  /**
   * Generates a random string of specified length.
   */
  static randomString(length: number = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

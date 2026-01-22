import { StringUtils } from './string.utils';

describe('StringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(StringUtils.capitalize('hello')).toBe('Hello');
      expect(StringUtils.capitalize('WORLD')).toBe('World');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.capitalize('')).toBe('');
    });
  });

  describe('slugify', () => {
    it('should create url-friendly slug', () => {
      expect(StringUtils.slugify('Hello World!')).toBe('hello-world');
      expect(StringUtils.slugify('  Spaced   String  ')).toBe('spaced-string');
    });
  });

  describe('sanitize', () => {
    it('should remove html tags', () => {
      expect(StringUtils.sanitize('<script>alert(1)</script>Hello')).toBe(
        'alert(1)Hello',
      );
      expect(StringUtils.sanitize('<b>Bold</b>')).toBe('Bold');
    });
  });

  describe('randomString', () => {
    it('should return string of requested length', () => {
      expect(StringUtils.randomString(10).length).toBe(10);
      expect(StringUtils.randomString(5).length).toBe(5);
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { DefaultPasswordPolicy } from './password.policy';

describe('DefaultPasswordPolicy', () => {
  let policy: DefaultPasswordPolicy;

  beforeEach(() => {
    policy = new DefaultPasswordPolicy();
  });

  describe('validate', () => {
    it('should validate a strong password', () => {
      expect(() => policy.validate('StrongPass1!')).not.toThrow();
    });

    it('should throw BadRequestException when password is too short', () => {
      expect(() => policy.validate('Short1!')).toThrow(BadRequestException);
      expect(() => policy.validate('Short1!')).toThrow(
        'Password must be at least 8 characters long',
      );
    });

    it('should throw BadRequestException when password is too long', () => {
      const longPassword = 'A1!' + 'a'.repeat(130);
      expect(() => policy.validate(longPassword)).toThrow(BadRequestException);
      expect(() => policy.validate(longPassword)).toThrow(
        'Password must not exceed 128 characters',
      );
    });

    it('should throw BadRequestException when password lacks uppercase', () => {
      expect(() => policy.validate('weakpass1!')).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password lacks lowercase', () => {
      expect(() => policy.validate('WEAKPASS1!')).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password lacks number', () => {
      expect(() => policy.validate('WeakPass!')).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password lacks special character', () => {
      expect(() => policy.validate('WeakPass123')).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password is too common', () => {
      expect(() => policy.validate('Password1!')).toThrow(
        'Password is too common. Please choose a stronger password',
      );
    });
  });
});

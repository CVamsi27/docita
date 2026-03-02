import { Injectable, BadRequestException } from '@nestjs/common';

export interface IPasswordPolicy {
  validate(password: string): void;
}

@Injectable()
export class DefaultPasswordPolicy implements IPasswordPolicy {
  validate(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    if (password.length > 128) {
      throw new BadRequestException('Password must not exceed 128 characters');
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      );
    }

    const commonPasswords = [
      'password',
      'Password1!',
      'Qwerty123!',
      'Admin123!',
    ];
    if (
      commonPasswords.some((cp) =>
        password.toLowerCase().includes(cp.toLowerCase()),
      )
    ) {
      throw new BadRequestException(
        'Password is too common. Please choose a stronger password',
      );
    }
  }
}

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  loginResponseSchema,
  registerResponseSchema,
  validateSessionResponseSchema,
  checkEmailResponseSchema,
} from '@workspace/types';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export const RegisterSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  clinicName: z
    .string()
    .min(2, 'Clinic name must be at least 2 characters')
    .optional()
    .or(z.literal('')),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
      ),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}

export const CheckEmailSchema = z.object({
  email: z.string().email(),
});

export class CheckEmailDto extends createZodDto(CheckEmailSchema) {}

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().optional(),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}

export const LogoutSchema = z.object({
  refresh_token: z.string().optional(),
});

export class LogoutRequestDto extends createZodDto(LogoutSchema) {}

export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}
export class ValidateSessionResponseDto extends createZodDto(
  validateSessionResponseSchema,
) {}
export class ChangePasswordResponseDto extends createZodDto(
  z.object({ success: z.boolean(), message: z.string().optional() }),
) {}
export class CheckEmailResponseDto extends createZodDto(
  checkEmailResponseSchema,
) {}

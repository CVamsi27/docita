import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  loginResponseSchema,
  registerResponseSchema,
  validateSessionResponseSchema,
  checkEmailResponseSchema,
} from '@workspace/types';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export const RegisterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    ),
  clinicName: z
    .string({ required_error: 'Clinic name is required' })
    .min(1, 'Clinic name is required'),
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

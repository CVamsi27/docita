import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  loginSchema,
  registerSchema,
  checkEmailSchema,
  refreshTokenSchema,
  logoutSchema,
  changePasswordSchema,
  loginResponseSchema,
  registerResponseSchema,
  validateSessionResponseSchema,
  checkEmailResponseSchema,
} from '@workspace/types';

export const LoginSchema = loginSchema;

export class LoginDto extends createZodDto(LoginSchema) {}

export const RegisterSchema = registerSchema;

export class RegisterDto extends createZodDto(RegisterSchema) {}

export const ChangePasswordSchema = changePasswordSchema;

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}

export const CheckEmailSchema = checkEmailSchema;

export class CheckEmailDto extends createZodDto(CheckEmailSchema) {}

export const RefreshTokenSchema = refreshTokenSchema;

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}

export const LogoutSchema = logoutSchema;

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

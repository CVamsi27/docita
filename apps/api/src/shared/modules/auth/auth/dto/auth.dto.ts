import { createZodDto } from 'nestjs-zod';
import {
  loginSchema,
  registerSchema,
  checkEmailSchema,
  refreshTokenSchema,
  logoutSchema,
  changePasswordSchema,
  registerResponseSchema,
  tokenIssueResponseSchema,
  messageAckResponseSchema,
  validateSessionResponseSchema,
  checkEmailResponseSchema,
  successResponseSchema,
  mfaVerifySchema,
  mfaCodeSchema,
  mfaSetupResponseSchema,
  mfaBackupCodesResponseSchema,
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

export const MfaVerifySchema = mfaVerifySchema;

export class MfaVerifyDto extends createZodDto(MfaVerifySchema) {}

export const MfaCodeSchema = mfaCodeSchema;

export class MfaCodeDto extends createZodDto(MfaCodeSchema) {}

export class TokenIssueResponseDto extends createZodDto(
  tokenIssueResponseSchema,
) {}
export class LogoutResponseDto extends createZodDto(messageAckResponseSchema) {}
export class MfaSetupResponseDto extends createZodDto(mfaSetupResponseSchema) {}
export class MfaBackupCodesResponseDto extends createZodDto(
  mfaBackupCodesResponseSchema,
) {}

export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}
export class ValidateSessionResponseDto extends createZodDto(
  validateSessionResponseSchema,
) {}
export class ChangePasswordResponseDto extends createZodDto(
  successResponseSchema,
) {}
export class CheckEmailResponseDto extends createZodDto(
  checkEmailResponseSchema,
) {}

import { Injectable } from '@nestjs/common';
import { CredentialValidationService } from './credential-validation.service';
import { AuthSessionService } from './auth-session.service';
import { AuthRegistrationService } from './auth-registration.service';
import { AuthPasswordService } from './auth-password.service';
import { AuthEmailVerificationService } from './auth-email-verification.service';
import { AuthMfaOrchestratorService } from './auth-mfa-orchestrator.service';
import type {
  AuthDeviceInfo,
  AuthLoginResult,
  ChangePasswordData,
  RegisterData,
  UserWithoutPassword,
} from './auth.types';

/**
 * Facade for authentication flows. Delegates to focused services (SRP).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly credentialValidation: CredentialValidationService,
    private readonly session: AuthSessionService,
    private readonly registration: AuthRegistrationService,
    private readonly password: AuthPasswordService,
    private readonly emailVerification: AuthEmailVerificationService,
    private readonly mfaOrchestrator: AuthMfaOrchestratorService,
  ) {}

  checkEmailExists(email: string) {
    return this.credentialValidation.checkEmailExists(email);
  }

  validateUser(email: string, pass: string) {
    return this.credentialValidation.validateUser(email, pass);
  }

  loginWithMfaCheck(user: UserWithoutPassword) {
    return this.mfaOrchestrator.loginWithMfaCheck(user);
  }

  loginAfterMfa(
    challengeToken: string,
    totpCode: string,
    deviceInfo?: AuthDeviceInfo,
  ) {
    return this.mfaOrchestrator.loginAfterMfa(
      challengeToken,
      totpCode,
      deviceInfo,
    );
  }

  login(
    user: UserWithoutPassword,
    tokenFamily?: string,
    deviceInfo?: AuthDeviceInfo,
  ): Promise<AuthLoginResult> {
    return this.session.login(user, tokenFamily, deviceInfo);
  }

  refreshTokens(incomingRefreshToken: string) {
    return this.session.refreshTokens(incomingRefreshToken);
  }

  getSessions(userId: string) {
    return this.session.getSessions(userId);
  }

  revokeSession(sessionId: string, userId: string) {
    return this.session.revokeSession(sessionId, userId);
  }

  revokeAllSessions(userId: string, exceptToken?: string) {
    return this.session.revokeAllSessions(userId, exceptToken);
  }

  logout(refreshToken: string) {
    return this.session.logout(refreshToken);
  }

  register(data: RegisterData) {
    return this.registration.register(data);
  }

  requestPasswordReset(email: string) {
    return this.password.requestPasswordReset(email);
  }

  resetPassword(token: string, newPassword: string) {
    return this.password.resetPassword(token, newPassword);
  }

  changePassword(data: ChangePasswordData) {
    return this.password.changePassword(data);
  }

  sendVerificationEmail(userId: string) {
    return this.emailVerification.sendVerificationEmail(userId);
  }

  verifyEmail(token: string) {
    return this.emailVerification.verifyEmail(token);
  }
}

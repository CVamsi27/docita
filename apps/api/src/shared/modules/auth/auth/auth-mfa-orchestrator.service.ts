import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MfaService } from './mfa.service';
import { AuthSessionService } from './auth-session.service';
import type { AuthDeviceInfo, AuthLoginResult, UserWithoutPassword } from './auth.types';

@Injectable()
export class AuthMfaOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfaService: MfaService,
    private readonly session: AuthSessionService,
  ) {}

  async loginWithMfaCheck(
    user: UserWithoutPassword,
  ): Promise<
    | { mfa_required: true; mfa_challenge_token: string }
    | AuthLoginResult
  > {
    if (user.mfaEnabled) {
      const challengeToken = await this.mfaService.issueMfaChallenge(user.id);
      return { mfa_required: true, mfa_challenge_token: challengeToken };
    }
    return this.session.login(user);
  }

  async loginAfterMfa(
    challengeToken: string,
    totpCode: string,
    deviceInfo?: AuthDeviceInfo,
  ) {
    const userId = await this.mfaService.verifyMfaChallenge(
      challengeToken,
      totpCode,
    );
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    const user = await this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          emailVerified: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.session.login(user, undefined, deviceInfo);
  }
}

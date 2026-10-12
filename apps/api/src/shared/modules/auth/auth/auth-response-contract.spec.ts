import { describe, expect, it } from '@jest/globals';
import assert from 'node:assert/strict';
import {
  loginWireResponseSchema,
  mfaBackupCodesResponseSchema,
  mfaChallengeResponseSchema,
  mfaCodeSchema,
  mfaSetupResponseSchema,
  mfaVerifySchema,
  messageAckResponseSchema,
  sessionUserSchema,
  tokenIssueResponseSchema,
} from '@workspace/types';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuthLoginController } from './auth-login.controller';
import { AuthSessionController } from './auth-session.controller';
import { AuthMfaController } from './auth-mfa.controller';
import { MfaCodeDto, MfaVerifyDto } from './dto/auth.dto';
import { SafeZodSerializerInterceptor } from '@/shared/common/interceptors/safe-zod-serializer.interceptor';

/** The SPA receives JSON, not the in-process objects the service returns. */
function overTheWire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

const SESSION_USER = {
  id: 'user_1',
  email: 'asha@clinic.test',
  name: 'Dr Asha Rao',
  role: 'DOCTOR',
  clinicId: 'clinic_1',
  emailVerified: true,
  onboardingStep: 'COMPLETED',
};

/** Exactly what `AuthSessionService.issueTokens` returns. */
const RAW_TOKEN_BUNDLE = {
  access_token: 'access.jwt.value',
  refresh_token: 'nanoid-refresh-value',
  user: SESSION_USER,
};

/** The body every session route actually returns: the bundle minus the token. */
const TOKEN_BODY = {
  access_token: RAW_TOKEN_BUNDLE.access_token,
  user: SESSION_USER,
};

const MFA_CHALLENGE = {
  mfa_required: true,
  mfa_challenge_token: 'mfa_challenge_value',
};

/**
 * `POST /auth/login`, `POST /auth/mfa/verify`, `POST /auth/refresh`,
 * `POST /auth/logout`, and the four `POST /auth/mfa/*` routes.
 *
 * All four session-issuing routes are `@Public()` and all of them call
 * `stripRefreshTokenFromBody` before returning, so none of them declared a
 * response contract and the raw service bundle went out untrimmed. That is a
 * thin margin for a route whose payload is a credential: the single guarantee
 * that the 30-day refresh token never appears in a JSON body was a helper
 * call, with nothing to catch the day the call is dropped.
 *
 * The declared contract closes that. `tokenIssueResponseSchema` has no
 * `refresh_token` key, so the serializer strips it even if the handler
 * forgets — asserted below rather than assumed.
 */
describe('auth response contracts', () => {
  describe('shape', () => {
    it('parses the session body a login/refresh handler returns', () => {
      const parsed = tokenIssueResponseSchema.parse(overTheWire(TOKEN_BODY));
      expect(parsed.access_token).toBe('access.jwt.value');
      expect(parsed.user.email).toBe('asha@clinic.test');
    });

    it('strips the refresh token from a handler that forgot to', () => {
      // The regression this contract exists for. `z.object` strips unknown keys
      // rather than rejecting, so a raw `issueTokens` bundle still parses —
      // without the 30-day credential in the response.
      const parsed = tokenIssueResponseSchema.parse(
        overTheWire(RAW_TOKEN_BUNDLE),
      ) as Record<string, unknown>;

      expect(parsed).not.toHaveProperty('refresh_token');
      expect(parsed.access_token).toBe('access.jwt.value');
    });

    it('trims the user fields the auth services never send', () => {
      const parsed = sessionUserSchema.parse(
        overTheWire({
          ...SESSION_USER,
          createdAt: '2026-01-01',
          passwordHash: 'x',
        }),
      ) as Record<string, unknown>;

      expect(parsed).not.toHaveProperty('createdAt');
      expect(parsed).not.toHaveProperty('passwordHash');
      expect(parsed.name).toBe('Dr Asha Rao');
    });

    it('requires the identity keys of a session user', () => {
      for (const key of ['id', 'email', 'name', 'role'] as const) {
        const { [key]: _dropped, ...rest } = SESSION_USER;
        assert.ok(
          !sessionUserSchema.safeParse(rest).success,
          `expected "${key}" to be required`,
        );
      }
    });

    it('refuses a session with an empty access token', () => {
      expect(
        tokenIssueResponseSchema.safeParse({
          access_token: '',
          user: SESSION_USER,
        }).success,
      ).toBe(false);
    });

    it('parses both branches of the login response', () => {
      const session = loginWireResponseSchema.parse(overTheWire(TOKEN_BODY));
      expect('access_token' in session).toBe(true);

      const challenge = loginWireResponseSchema.parse(
        overTheWire(MFA_CHALLENGE),
      ) as Record<string, unknown>;
      expect(challenge.mfa_required).toBe(true);
      expect(challenge).not.toHaveProperty('access_token');
      expect(challenge).not.toHaveProperty('user');
    });

    it('never reads a session off an MFA challenge', () => {
      // The two branches are mutually exclusive on required keys, so a
      // challenge cannot be mistaken for a session by a client that only
      // checks for `access_token`.
      const challenge = mfaChallengeResponseSchema.parse(MFA_CHALLENGE);
      expect(tokenIssueResponseSchema.safeParse(challenge).success).toBe(false);
      expect(mfaChallengeResponseSchema.safeParse(TOKEN_BODY).success).toBe(
        false,
      );
    });

    it('refuses a logout acknowledgement that carries no message', () => {
      expect(messageAckResponseSchema.safeParse({}).success).toBe(false);
      expect(
        messageAckResponseSchema.safeParse({ message: 'Logged out' }).success,
      ).toBe(true);
    });

    it('parses the MFA setup and backup-code responses', () => {
      const setup = mfaSetupResponseSchema.parse({
        qrCodeUrl: 'data:image/png;base64,AAA',
        manualEntryKey: 'JBSWY3DPEHPK3PXP',
      });
      expect(setup.manualEntryKey).toBe('JBSWY3DPEHPK3PXP');
      expect(
        mfaSetupResponseSchema.safeParse({ qrCodeUrl: 'data:...' }).success,
      ).toBe(false);

      expect(
        mfaBackupCodesResponseSchema.parse({ backupCodes: ['a', 'b'] }),
      ).toEqual({ backupCodes: ['a', 'b'] });
      expect(
        mfaBackupCodesResponseSchema.safeParse({ backupCodes: [] }).success,
      ).toBe(false);
    });
  });

  describe('request validation on the MFA routes', () => {
    // `POST /auth/mfa/verify` and the three `POST /auth/mfa/*` code routes
    // took `@Body() body: { code: string }` — a TypeScript type with no
    // runtime schema, which the global pipe skips. An empty body reached
    // `verifyMfaChallenge(undefined, undefined)` on an unauthenticated route.
    it('rejects an MFA verify body with either key missing', () => {
      expect(MfaVerifyDto.schema.safeParse({}).success).toBe(false);
      expect(
        MfaVerifyDto.schema.safeParse({
          mfa_challenge_token: 'mfa_challenge_value',
        }).success,
      ).toBe(false);
      expect(MfaVerifyDto.schema.safeParse({ code: '123456' }).success).toBe(
        false,
      );
      expect(
        MfaVerifyDto.schema.safeParse({
          mfa_challenge_token: 'mfa_challenge_value',
          code: '123456',
        }).success,
      ).toBe(true);
    });

    it('rejects an empty MFA code', () => {
      expect(
        mfaVerifySchema.safeParse({ mfa_challenge_token: 't', code: '' })
          .success,
      ).toBe(false);
      expect(mfaCodeSchema.safeParse({}).success).toBe(false);
      expect(mfaCodeSchema.safeParse({ code: '' }).success).toBe(false);
      expect(mfaCodeSchema.safeParse({ code: '123456' }).success).toBe(true);
      expect(MfaCodeDto.schema.safeParse({}).success).toBe(false);
    });
  });

  describe('serializer on the routes', () => {
    const reflector = new Reflector();
    const interceptor = new SafeZodSerializerInterceptor(reflector);

    function serialize(
      owner: unknown,
      handler: (...args: never[]) => unknown,
      payload: unknown,
    ): Promise<unknown> {
      const context = {
        getHandler: () => handler,
        getClass: () => owner,
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', url: '/auth' }),
        }),
      } as unknown as ExecutionContext;

      return lastValueFrom(
        interceptor.intercept(context, {
          handle: () => of(payload),
        } as CallHandler),
      );
    }

    const routes = [
      {
        name: 'login',
        owner: AuthLoginController,
        handler: AuthLoginController.prototype.login,
        payload: TOKEN_BODY,
      },
      {
        name: 'login (MFA challenge branch)',
        owner: AuthLoginController,
        handler: AuthLoginController.prototype.login,
        payload: MFA_CHALLENGE,
      },
      {
        name: 'mfa/verify',
        owner: AuthLoginController,
        handler: AuthLoginController.prototype.verifyMfa,
        payload: TOKEN_BODY,
      },
      {
        name: 'refresh',
        owner: AuthSessionController,
        handler: AuthSessionController.prototype.refresh,
        payload: TOKEN_BODY,
      },
      {
        name: 'logout',
        owner: AuthSessionController,
        handler: AuthSessionController.prototype.logoutUser,
        payload: { message: 'Logged out successfully' },
      },
      {
        name: 'mfa/setup',
        owner: AuthMfaController,
        handler: AuthMfaController.prototype.setupMfa,
        payload: {
          qrCodeUrl: 'data:image/png;base64,AAA',
          manualEntryKey: 'JBSWY3DPEHPK3PXP',
        },
      },
      {
        name: 'mfa/enable',
        owner: AuthMfaController,
        handler: AuthMfaController.prototype.enableMfa,
        payload: { backupCodes: ['a', 'b'] },
      },
      {
        name: 'mfa/disable',
        owner: AuthMfaController,
        handler: AuthMfaController.prototype.disableMfa,
        payload: { message: 'MFA disabled successfully' },
      },
      {
        name: 'mfa/backup-codes',
        owner: AuthMfaController,
        handler: AuthMfaController.prototype.regenerateBackupCodes,
        payload: { backupCodes: ['c', 'd'] },
      },
    ];

    it.each(routes)('$name declares a response contract', (route) => {
      const declared = reflector.getAllAndOverride<unknown>(
        'ZOD_SERIALIZER_DTO_OPTIONS',
        [route.handler, route.owner],
      );
      assert.ok(declared, `${route.name} declares no response contract`);
    });

    it.each(routes)(
      '$name serializes without dropping a real field',
      async (route) => {
        const serialized = await serialize(
          route.owner,
          route.handler,
          route.payload,
        );
        expect(serialized).toEqual(overTheWire(route.payload));
      },
    );

    it.each(routes.filter((route) => route.payload === TOKEN_BODY))(
      '$name strips the refresh token from a raw token bundle',
      async (route) => {
        const serialized = (await serialize(
          route.owner,
          route.handler,
          RAW_TOKEN_BUNDLE,
        )) as Record<string, unknown>;

        expect(serialized).not.toHaveProperty('refresh_token');
        expect(serialized.access_token).toBe('access.jwt.value');
      },
    );
  });
});

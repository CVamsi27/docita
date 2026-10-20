import { describe, expect, it } from '@jest/globals';
import assert from 'node:assert/strict';
import {
  loginWireResponseSchema,
  otpRequestAckResponseSchema,
  partnerOtpVerifyResponseSchema,
  partnerTokenRefreshResponseSchema,
  sessionUserSchema,
  tokenIssueResponseSchema,
} from '@workspace/types';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import {
  PatientPortalAuthController,
  RequestOtpDto,
  VerifyOtpDto,
} from '@/domains/patient-portal/presentation/controllers/patient-portal-auth.controller';
import { LabPortalAuthController } from '@/domains/lab-portal/presentation/controllers/lab-portal-auth.controller';
import { PartnerAuthController } from '@/domains/subscriptions/presentation/controllers/partner-auth.controller';
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

const TOKEN_BODY = {
  access_token: RAW_TOKEN_BUNDLE.access_token,
  user: SESSION_USER,
};

const MFA_CHALLENGE = {
  mfa_required: true,
  mfa_challenge_token: 'mfa_challenge_value',
};

/** Byte-identical from both portal `requestOtp` services. */
const OTP_ACK = {
  message: 'If an active partner matches this phone, an OTP has been sent.',
  expiresInSeconds: 600,
};

const PARTNER_VERIFY_BODY = {
  accessToken: 'partner.access.jwt',
  expiresIn: 900,
  referrer: {
    id: 'ref_1',
    name: 'Sunrise Diagnostics',
    code: 'SUNRISE',
    type: 'CLINIC',
  },
};

const PARTNER_REFRESH_BODY = {
  accessToken: 'partner.access.jwt.rotated',
  expiresIn: 900,
};

/**
 * The three public portal auth controllers — patient portal OTP, lab portal
 * login, and partner OTP/refresh.
 *
 * All six routes are `@Public()`, and none of them declared a response
 * contract. The lab portal was worse than undeclared: it returned
 * `LabPortalAuthCommandService.login`'s result verbatim, which is an
 * `AuthLoginResult` carrying `refresh_token`, while *also* setting that token
 * as an httpOnly cookie. The cookie was decorative — the same credential sat
 * in the JSON body where any script on the portal origin can read it.
 *
 * Both layers are asserted here: the handler no longer returns the token, and
 * the declared contract strips it even if a future edit puts it back.
 */
describe('public portal auth response contracts', () => {
  describe('shape', () => {
    it('keeps the resend countdown the OTP countdown reads', () => {
      // `z.object` strips unknown keys. Using the narrower
      // `messageAckResponseSchema` here would silently drop
      // `expiresInSeconds` and break the portal's resend timer, which is
      // exactly what `use-portal-otp-auth.ts` reads.
      const parsed = otpRequestAckResponseSchema.parse(overTheWire(OTP_ACK));
      expect(parsed.expiresInSeconds).toBe(600);
      expect(parsed.message).toContain('OTP');
    });

    it('refuses an OTP acknowledgement with no countdown', () => {
      expect(otpRequestAckResponseSchema.safeParse({}).success).toBe(false);
      expect(
        otpRequestAckResponseSchema.safeParse({
          message: 'Sent.',
          expiresInSeconds: 0,
        }).success,
      ).toBe(false);
      expect(
        otpRequestAckResponseSchema.safeParse({ message: 'Sent.' }).success,
      ).toBe(false);
    });

    it('strips the refresh token from a raw token bundle', () => {
      const parsed = tokenIssueResponseSchema.parse(
        overTheWire(RAW_TOKEN_BUNDLE),
      ) as Record<string, unknown>;

      expect(parsed).not.toHaveProperty('refresh_token');
      expect(parsed.access_token).toBe('access.jwt.value');
    });

    it('parses both branches of the patient portal verify response', () => {
      const session = loginWireResponseSchema.parse(overTheWire(TOKEN_BODY));
      expect('access_token' in session).toBe(true);

      const challenge = loginWireResponseSchema.parse(
        overTheWire(MFA_CHALLENGE),
      ) as Record<string, unknown>;
      expect(challenge.mfa_required).toBe(true);
      expect(challenge).not.toHaveProperty('access_token');
    });

    it('parses the partner verify and refresh responses', () => {
      const verify = partnerOtpVerifyResponseSchema.parse(
        overTheWire(PARTNER_VERIFY_BODY),
      );
      expect(verify.referrer.code).toBe('SUNRISE');

      const refreshed = partnerTokenRefreshResponseSchema.parse(
        overTheWire(PARTNER_REFRESH_BODY),
      );
      expect(refreshed.accessToken).toBe('partner.access.jwt.rotated');
    });

    it('never puts a partner refresh token in a body contract', () => {
      const contracts = [
        {
          name: 'verify-otp',
          schema: partnerOtpVerifyResponseSchema,
          body: PARTNER_VERIFY_BODY,
        },
        {
          name: 'refresh',
          schema: partnerTokenRefreshResponseSchema,
          body: PARTNER_REFRESH_BODY,
        },
      ] as const;

      for (const contract of contracts) {
        const leaked = contract.schema.safeParse({
          ...contract.body,
          refreshToken: 'partner.refresh.jwt',
        });
        assert.ok(
          leaked.success,
          `partner/auth/${contract.name} body must still parse with an extra refreshToken key`,
        );
        expect(leaked.data).not.toHaveProperty('refreshToken');
      }
    });

    it('strips referrer metadata from a partner refresh body', () => {
      // A refresh rotates the token; if referrer data ever leaked into that
      // body the contract drops it rather than forwarding it.
      const parsed = partnerTokenRefreshResponseSchema.parse(
        overTheWire({
          ...PARTNER_REFRESH_BODY,
          referrer: PARTNER_VERIFY_BODY.referrer,
        }),
      ) as Record<string, unknown>;

      expect(parsed).not.toHaveProperty('referrer');
      expect(parsed.accessToken).toBe('partner.access.jwt.rotated');
    });

    it('trims session fields the portal services never send', () => {
      const parsed = sessionUserSchema.parse(
        overTheWire({ ...SESSION_USER, passwordHash: 'x' }),
      ) as Record<string, unknown>;
      expect(parsed).not.toHaveProperty('passwordHash');
      expect(parsed.email).toBe('asha@clinic.test');
    });
  });

  describe('request validation on the portal OTP routes', () => {
    // Both patient-portal routes took `@Body() dto: { phoneNumber!: string }`
    // — a TypeScript class with no runtime schema, which the global pipe
    // skips. The hand-rolled `if (!dto.phoneNumber)` guards were the only
    // thing between an empty body and the service.
    it('rejects an empty patient-portal request-otp body', () => {
      expect(RequestOtpDto.schema.safeParse({}).success).toBe(false);
      expect(RequestOtpDto.schema.safeParse({ phoneNumber: '' }).success).toBe(
        false,
      );
      expect(
        RequestOtpDto.schema.safeParse({ phoneNumber: '+919876543210' })
          .success,
      ).toBe(true);
    });

    it('rejects an empty patient-portal verify-otp body', () => {
      expect(VerifyOtpDto.schema.safeParse({}).success).toBe(false);
      expect(
        VerifyOtpDto.schema.safeParse({ phoneNumber: '+919876543210' }).success,
      ).toBe(false);
      expect(VerifyOtpDto.schema.safeParse({ otp: '123456' }).success).toBe(
        false,
      );
      expect(
        VerifyOtpDto.schema.safeParse({
          phoneNumber: '+919876543210',
          otp: '123456',
        }).success,
      ).toBe(true);
    });
  });

  describe('the lab portal handler no longer returns the refresh token', () => {
    it('drops refresh_token from the body while still setting the cookie', async () => {
      const login = jest
        .fn()
        .mockResolvedValue(RAW_TOKEN_BUNDLE as never) as never;
      const cookies: Array<{ name: string; value: string }> = [];
      const response = {
        cookie: (name: string, value: string) => cookies.push({ name, value }),
        clearCookie: () => undefined,
      };
      const controller = new LabPortalAuthController(
        { login } as never,
        { isProduction: () => false } as never,
      );

      const body = (await controller.login(
        { email: 'a@b.test', password: 'p' },
        response as never,
      )) as Record<string, unknown>;

      expect(body).not.toHaveProperty('refresh_token');
      expect(body.access_token).toBe('access.jwt.value');
      // The token still has to reach the browser — as an httpOnly cookie.
      expect(cookies).toContainEqual({
        name: 'refresh_token',
        value: 'nanoid-refresh-value',
      });
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
          getRequest: () => ({ method: 'POST', url: '/portal/auth' }),
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
        name: 'patient-portal/auth/request-otp',
        owner: PatientPortalAuthController,
        handler: PatientPortalAuthController.prototype.requestOtp,
        payload: OTP_ACK,
      },
      {
        name: 'patient-portal/auth/verify-otp',
        owner: PatientPortalAuthController,
        handler: PatientPortalAuthController.prototype.verifyOtp,
        payload: TOKEN_BODY,
      },
      {
        name: 'lab-portal/auth/login',
        owner: LabPortalAuthController,
        handler: LabPortalAuthController.prototype.login,
        payload: TOKEN_BODY,
      },
      {
        name: 'partner/auth/request-otp',
        owner: PartnerAuthController,
        handler: PartnerAuthController.prototype.requestOtp,
        payload: OTP_ACK,
      },
      {
        name: 'partner/auth/verify-otp',
        owner: PartnerAuthController,
        handler: PartnerAuthController.prototype.verifyOtp,
        payload: PARTNER_VERIFY_BODY,
      },
      {
        name: 'partner/auth/refresh',
        owner: PartnerAuthController,
        handler: PartnerAuthController.prototype.refresh,
        payload: PARTNER_REFRESH_BODY,
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

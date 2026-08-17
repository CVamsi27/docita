import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
  type SendMessageRequest,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { setPrismaInstance } from '../../factories';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { getCsrfHeaders } from '../../csrf-helpers';
import { PARTNER_REFRESH_COOKIE_NAME } from '@workspace/types';

interface CsrfHeaders {
  cookie: string;
  token: string;
}

function csrfHeaders(headers: CsrfHeaders): {
  Cookie: string;
  'X-XSRF-TOKEN': string;
} {
  return { Cookie: headers.cookie, 'X-XSRF-TOKEN': headers.token };
}

/** Extract a cookie value from Set-Cookie headers (supertest stores them). */
function extractCookie(headers: Record<string, unknown>, name: string): string | undefined {
  const setCookie = headers['set-cookie'] as string[] | undefined;
  if (!setCookie) return undefined;
  for (const entry of setCookie) {
    const match = entry.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return undefined;
}

const PARTNER_PHONE = '+919876543210';

/**
 * Captures OTPs the auth service sends through the WhatsApp client port.
 * `sendLoginOtp` puts the OTP in the body component's `text` parameter,
 * so the e2e can verify the full request-otp -> verify-otp flow with the
 * real challenge row + bcrypt hash, mocking only the WhatsApp transport.
 */
const sentOtps: string[] = [];

const mockWhatsAppClient: IWhatsAppClient = {
  sendMessage: jest
    .fn()
    .mockImplementation(async (request: SendMessageRequest) => {
      const bodyComponent = request.components?.find(
        (component) => component.type === 'body',
      );
      const parameters = (bodyComponent?.parameters ?? []) as Array<{
        type?: string;
        text?: string;
      }>;
      const otp = parameters.find(
        (parameter) => parameter.type === 'text',
      )?.text;
      if (otp) sentOtps.push(otp);
      return { externalId: 'wamid.e2e-partner-otp' };
    }),
  sendInteractiveMessage: jest
    .fn()
    .mockResolvedValue({ externalId: 'wamid.e2e-partner' }),
  checkHealth: jest.fn().mockResolvedValue(true),
};

describe('Partner Portal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let referrerId: string;

  async function obtainTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const csrf = await getCsrfHeaders(app.getHttpServer());
    await request(app.getHttpServer())
      .post('/partner/auth/request-otp')
      .set(csrfHeaders(csrf))
      .send({ phone: PARTNER_PHONE })
      .expect(200);
    const otp = sentOtps.at(-1);
    if (!otp) throw new Error('No OTP captured by the WhatsApp mock');
    const response = await request(app.getHttpServer())
      .post('/partner/auth/verify-otp')
      .set(csrfHeaders(csrf))
      .send({ phone: PARTNER_PHONE, otp })
      .expect(200);
    const refreshToken = extractCookie(
      response.headers as Record<string, unknown>,
      PARTNER_REFRESH_COOKIE_NAME,
    );
    if (!refreshToken) {
      throw new Error('partner_refresh_token cookie not set on verify-otp response');
    }
    return {
      accessToken: response.body.accessToken as string,
      refreshToken,
    };
  }

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WHATSAPP_CLIENT_TOKEN)
      .useValue(mockWhatsAppClient)
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    // resetDatabase does not cover the referral tables; clear them here.
    await prisma.partnerOtpChallenge.deleteMany();
    await prisma.referrer.deleteMany();
    sentOtps.length = 0;

    const referrer = await prisma.referrer.create({
      data: {
        type: 'CLINIC',
        rewardKind: 'CREDIT_MONTHS',
        name: 'E2E Referral Partner',
        phone: PARTNER_PHONE,
        code: 'RFR-E2E0001',
        active: true,
      },
    });
    referrerId = referrer.id;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('POST /partner/auth/request-otp', () => {
    it('returns a generic success and sends a 6-digit OTP to a matching active referrer', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      const response = await request(app.getHttpServer())
        .post('/partner/auth/request-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: PARTNER_PHONE })
        .expect(200);

      expect(response.body.message).toContain('OTP has been sent');
      expect(response.body.expiresInSeconds).toBe(600);
      expect(sentOtps).toHaveLength(1);
      expect(sentOtps[0]).toMatch(/^\d{6}$/);
    });

    it('is non-enumerable: an unknown phone returns the same shape and sends nothing', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      const response = await request(app.getHttpServer())
        .post('/partner/auth/request-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: '+919999999999' })
        .expect(200);

      expect(response.body.message).toContain('OTP has been sent');
      expect(response.body.expiresInSeconds).toBe(600);
      expect(sentOtps).toHaveLength(0);
    });

    it('rejects a malformed phone with 400', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      await request(app.getHttpServer())
        .post('/partner/auth/request-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: 'not-a-phone' })
        .expect(400);
    });
  });

  describe('POST /partner/auth/verify-otp', () => {
    it('issues access token and sets refresh cookie for a valid OTP', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      await request(app.getHttpServer())
        .post('/partner/auth/request-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: PARTNER_PHONE })
        .expect(200);
      expect(sentOtps).toHaveLength(1);

      const response = await request(app.getHttpServer())
        .post('/partner/auth/verify-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: PARTNER_PHONE, otp: sentOtps[0] })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.expiresIn).toBe(900);
      // The refresh token is in the httpOnly cookie, not the body.
      const refreshToken = extractCookie(
        response.headers as Record<string, unknown>,
        PARTNER_REFRESH_COOKIE_NAME,
      );
      expect(refreshToken).toBeDefined();
      expect(response.body.referrer).toMatchObject({
        id: referrerId,
        name: 'E2E Referral Partner',
        code: 'RFR-E2E0001',
        type: 'CLINIC',
      });
    });

    it('rejects a wrong OTP with 401', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      await request(app.getHttpServer())
        .post('/partner/auth/request-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: PARTNER_PHONE })
        .expect(200);

      await request(app.getHttpServer())
        .post('/partner/auth/verify-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: PARTNER_PHONE, otp: '000000' })
        .expect(401);
    });

    it('rejects a phone with no outstanding challenge with 401', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      await request(app.getHttpServer())
        .post('/partner/auth/verify-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: PARTNER_PHONE, otp: '123456' })
        .expect(401);
    });

    it('rejects a malformed body with 400', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      await request(app.getHttpServer())
        .post('/partner/auth/verify-otp')
        .set(csrfHeaders(csrf))
        .send({ phone: 'bad', otp: 'x' })
        .expect(400);
    });
  });

  describe('GET /partner/me', () => {
    it('returns the partner profile with a valid access token', async () => {
      const accessToken = (await obtainTokens()).accessToken;

      const response = await request(app.getHttpServer())
        .get('/partner/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: referrerId,
        name: 'E2E Referral Partner',
        type: 'CLINIC',
        rewardKind: 'CREDIT_MONTHS',
        code: 'RFR-E2E0001',
        active: true,
      });
      expect(response.body.counts).toMatchObject({
        referrals: 0,
        converted: 0,
        pendingPayoutsCents: 0,
        paidPayoutsCents: 0,
      });
      expect(response.body.loginUrl).toBeTruthy();
    });

    it('rejects a missing bearer token with 401', async () => {
      await request(app.getHttpServer()).get('/partner/me').expect(401);
    });

    it('rejects a garbage bearer token with 401', async () => {
      await request(app.getHttpServer())
        .get('/partner/me')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });

    it('rejects an existing access token once the partner is deactivated', async () => {
      const { accessToken } = await obtainTokens();
      // Deactivation (internal console) must terminate the existing session
      // on the next request — not only block new logins.
      await prisma.referrer.update({
        where: { id: referrerId },
        data: { active: false },
      });

      await request(app.getHttpServer())
        .get('/partner/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('POST /partner/auth/refresh', () => {
    it('rotates a refresh cookie into a fresh access token', async () => {
      const { refreshToken } = await obtainTokens();
      const csrf = await getCsrfHeaders(app.getHttpServer());

      const response = await request(app.getHttpServer())
        .post('/partner/auth/refresh')
        .set(csrfHeaders(csrf))
        .set('Cookie', `${PARTNER_REFRESH_COOKIE_NAME}=${refreshToken}`)
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.expiresIn).toBe(900);
      expect(response.body.accessToken).not.toBe(refreshToken);
    });

    it('rejects an access token used as a refresh token with 401', async () => {
      const { accessToken } = await obtainTokens();
      const csrf = await getCsrfHeaders(app.getHttpServer());

      await request(app.getHttpServer())
        .post('/partner/auth/refresh')
        .set(csrfHeaders(csrf))
        .set('Cookie', `${PARTNER_REFRESH_COOKIE_NAME}=${accessToken}`)
        .expect(401);
    });

    it('rejects a missing refresh cookie with 401', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      await request(app.getHttpServer())
        .post('/partner/auth/refresh')
        .set(csrfHeaders(csrf))
        .expect(401);
    });

    it('rejects a refresh token once the partner is deactivated', async () => {
      const { refreshToken } = await obtainTokens();
      await prisma.referrer.update({
        where: { id: referrerId },
        data: { active: false },
      });
      const csrf = await getCsrfHeaders(app.getHttpServer());

      await request(app.getHttpServer())
        .post('/partner/auth/refresh')
        .set(csrfHeaders(csrf))
        .set('Cookie', `${PARTNER_REFRESH_COOKIE_NAME}=${refreshToken}`)
        .expect(401);
    });
  });
});

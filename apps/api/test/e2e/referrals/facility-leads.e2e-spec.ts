import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
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
import { factories, setPrismaInstance } from '../../factories';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { getCsrfHeaders } from '../../csrf-helpers';
import { signE2eAccessToken } from '../../e2e-auth-token';

const PARTNER_PHONE = '+919876543210';

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

function csrfHeaders(headers: { cookie: string; token: string }): {
  Cookie: string;
  'X-XSRF-TOKEN': string;
} {
  return { Cookie: headers.cookie, 'X-XSRF-TOKEN': headers.token };
}

const leadBody = (overrides: Record<string, unknown> = {}) => ({
  facilityName: 'Sunrise Diagnostics',
  facilityType: 'DIAGNOSTIC_CENTRE',
  address: '12 MG Road, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  contactName: 'Dr Anil',
  contactRole: 'Owner',
  contactPhone: '+919812345678',
  consentToFollowUp: true,
  sourceNote: 'Referred by a mutual contact',
  preferredChannel: 'WHATSAPP',
  ...overrides,
});

describe('Facility Leads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let internalToken: string;
  let internalUserId: string;
  let adminToken: string;

  async function obtainPartnerToken(phone: string): Promise<string> {
    const csrf = await getCsrfHeaders(app.getHttpServer());
    await request(app.getHttpServer())
      .post('/partner/auth/request-otp')
      .set(csrfHeaders(csrf))
      .send({ phone })
      .expect(200);
    const otp = sentOtps.at(-1);
    if (!otp) throw new Error('No OTP captured by the WhatsApp mock');
    const response = await request(app.getHttpServer())
      .post('/partner/auth/verify-otp')
      .set(csrfHeaders(csrf))
      .send({ phone, otp })
      .expect(200);
    return response.body.accessToken as string;
  }

  async function seedPartner(phone: string, code: string): Promise<string> {
    const referrer = await prisma.referrer.create({
      data: {
        type: 'PHARMACY',
        rewardKind: 'REVENUE_SHARE',
        name: `E2E Partner ${code}`,
        phone,
        code,
        active: true,
      },
    });
    return referrer.id;
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
    jwtService = moduleFixture.get<JwtService>(JwtService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    // resetDatabase does not cover the referral tables; clear them here.
    await prisma.partnerOtpChallenge.deleteMany();
    await prisma.facilityLead.deleteMany();
    await prisma.referrer.deleteMany();
    sentOtps.length = 0;

    // Users must be created AFTER the reset (it wipes them); mint the
    // operator tokens fresh per test.
    const internalUser = await factories.user({ role: Role.INTERNAL });
    internalUserId = internalUser.user.id;
    internalToken = signE2eAccessToken(jwtService, {
      sub: internalUser.user.id,
      email: internalUser.user.email,
      role: Role.INTERNAL,
      name: internalUser.user.name,
      clinicId: internalUser.user.clinicId,
    });

    const adminUser = await factories.user({ role: Role.ADMIN });
    adminToken = signE2eAccessToken(jwtService, {
      sub: adminUser.user.id,
      email: adminUser.user.email,
      role: Role.ADMIN,
      name: adminUser.user.name,
      clinicId: adminUser.user.clinicId,
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('POST /partner/me/leads', () => {
    it('creates a SUBMITTED lead for the authenticated partner', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD01');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      const response = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'SUBMITTED',
        facilityName: 'Sunrise Diagnostics',
        city: 'Bengaluru',
        referrerName: 'E2E Partner RFR-E2ELD01',
        contactPhone: '+919812345678',
        consentToFollowUp: true,
      });
      expect(response.body.statusHistory).toBeUndefined();
    });

    it('rejects a second lead with the same contact phone as DUPLICATE_ENTRY', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD02');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-aaaa0001' }))
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(
          leadBody({
            facilityName: 'Sunrise Diagnostics Two',
            idempotencyKey: 'lead-key-aaaa0002',
          }),
        )
        .expect(409);

      expect(response.body.code).toBe('DUPLICATE_ENTRY');
    });

    it('replays an idempotency key to the original lead instead of duplicating', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD03');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      const first = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-bbbb0001' }))
        .expect(200);

      const second = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-bbbb0001' }))
        .expect(200);

      expect(second.body.id).toBe(first.body.id);
      expect(second.body.status).toBe('SUBMITTED');
    });

    it('rejects a malformed body with 400', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD04');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ facilityName: 'X' })
        .expect(400);
    });
  });

  describe('GET /internal/leads', () => {
    it('lists leads with the partner name for an INTERNAL operator', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD05');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/internal/leads')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: created.body.id,
        referrerName: 'E2E Partner RFR-E2ELD05',
        status: 'SUBMITTED',
      });
    });

    it('rejects a non-INTERNAL operator with 403', async () => {
      await request(app.getHttpServer())
        .get('/internal/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('PATCH /internal/leads/:id/status', () => {
    it('advances the lead and records actor + reason in the history', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD06');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/internal/leads/${created.body.id}/status`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({
          status: 'TRIAGED',
          reason: 'Qualified via phone, needs a demo',
        })
        .expect(200);

      expect(response.body.status).toBe('TRIAGED');
      expect(response.body.statusHistory).toHaveLength(1);
      expect(response.body.statusHistory[0]).toMatchObject({
        from: 'SUBMITTED',
        to: 'TRIAGED',
        reason: 'Qualified via phone, needs a demo',
        actorId: internalUserId,
      });
    });

    it('rejects an edge that skips the chain with 400', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD07');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/internal/leads/${created.body.id}/status`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ status: 'CONTACTED', reason: 'Skip triage entirely' })
        .expect(400);
    });

    it('rejects a transition on an unknown lead with 404', async () => {
      await request(app.getHttpServer())
        .patch('/internal/leads/does-not-exist/status')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ status: 'TRIAGED', reason: 'Something happened' })
        .expect(404);
    });
  });
});

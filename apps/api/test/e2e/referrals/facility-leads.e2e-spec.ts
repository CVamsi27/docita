import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
import { OutboxRelayScheduler } from '@/shared/modules/outbox/outbox-relay.scheduler';
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
  let outboxRelay: OutboxRelayScheduler;
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
    outboxRelay = moduleFixture.get<OutboxRelayScheduler>(OutboxRelayScheduler);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    // resetDatabase does not cover the referral tables; clear them here.
    await prisma.partnerOtpChallenge.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.facilityLeadNotification.deleteMany();
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

      expect(response.body.items).toHaveLength(1);
      expect(response.body.nextCursor).toBeUndefined();
      expect(response.body.hasMore).toBe(false);
      expect(response.body.items[0]).toMatchObject({
        id: created.body.id,
        referrerName: 'E2E Partner RFR-E2ELD05',
        status: 'SUBMITTED',
      });
    });

    it('filters the queue by status, owner, and referrer and pages with a cursor', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD14');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const first = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'RFR-E2ELD14-key-1' }))
        .expect(200);
      const second = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(
          leadBody({
            facilityName: 'Sunset Clinics',
            // A different contact phone avoids the same-phone DUPLICATE_ENTRY
            // 409 (that contract is asserted separately).
            contactPhone: '+919800000002',
            idempotencyKey: 'RFR-E2ELD14-key-2',
          }),
        )
        .expect(200);

      // Partner filter narrows to this partner's two leads.
      const byPartner = await request(app.getHttpServer())
        .get(`/internal/leads?referrerId=${first.body.referrerId}`)
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(byPartner.body.items).toHaveLength(2);

      // Status filter (SUBMITTED) + pagination: page 1 has one lead and a
      // cursor; page 2 has the other and no further cursor.
      const pageOne = await request(app.getHttpServer())
        .get('/internal/leads?status=SUBMITTED&limit=1')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(pageOne.body.items).toHaveLength(1);
      expect(pageOne.body.hasMore).toBe(true);
      expect(typeof pageOne.body.nextCursor).toBe('string');

      const pageTwo = await request(app.getHttpServer())
        .get(
          `/internal/leads?status=SUBMITTED&limit=1&cursor=${pageOne.body.nextCursor}`,
        )
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(pageTwo.body.items).toHaveLength(1);
      expect(pageTwo.body.hasMore).toBe(false);
      expect(pageTwo.body.nextCursor).toBeUndefined();
      expect([first.body.id, second.body.id].sort()).toEqual(
        [pageOne.body.items[0].id, pageTwo.body.items[0].id].sort(),
      );

      // Owner filter: unassigned matches both; after assigning one, only one
      // remains unassigned.
      const unassigned = await request(app.getHttpServer())
        .get('/internal/leads?owner=UNASSIGNED')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(unassigned.body.items).toHaveLength(2);

      const assignee = await factories.user({ role: Role.INTERNAL });
      await request(app.getHttpServer())
        .patch(`/internal/leads/${first.body.id}/assign`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: assignee.user.id })
        .expect(200);

      const unassignedAfter = await request(app.getHttpServer())
        .get('/internal/leads?owner=UNASSIGNED')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(unassignedAfter.body.items).toHaveLength(1);
      expect(unassignedAfter.body.items[0].id).toBe(second.body.id);

      // Owner filter by operator id exposes only the assigned lead.
      const owned = await request(app.getHttpServer())
        .get(`/internal/leads?owner=${assignee.user.id}`)
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(owned.body.items).toHaveLength(1);
      expect(owned.body.items[0].id).toBe(first.body.id);
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

  describe('outbox notification (lead-created P0)', () => {
    it('persists exactly one facility-lead.created outbox event per lead, atomically with submit', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD08');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      const events = await prisma.outboxEvent.findMany({
        where: { eventName: 'facility-lead.created' },
        select: { aggregateId: true, idempotencyKey: true, payload: true },
      });
      expect(events).toHaveLength(1);
      expect(events[0].aggregateId).toBe(created.body.id);
      expect(events[0].idempotencyKey).toBe(
        `facility-lead.created:${created.body.id}`,
      );
      // Identifiers only — no PHI in the outbox payload.
      expect(events[0].payload).toEqual({
        leadId: created.body.id,
        referrerId: expect.any(String),
      });
    });

    it('does not append a second event when the same lead is resubmitted with the same key', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD09');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      const first = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-cccc0001' }))
        .expect(200);

      await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-cccc0001' }))
        .expect(200);

      const events = await prisma.outboxEvent.findMany({
        where: {
          eventName: 'facility-lead.created',
          aggregateId: first.body.id,
        },
      });
      expect(events).toHaveLength(1);
    });

    it('appends a facility-lead.converted event when an operator converts the lead', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD10');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      // Walk the chain to TRIAL, then convert.
      for (const [from, to] of [
        ['SUBMITTED', 'TRIAGED'],
        ['TRIAGED', 'CONTACT_ATTEMPTED'],
        ['CONTACT_ATTEMPTED', 'CONTACTED'],
        ['CONTACTED', 'DEMO_SCHEDULED'],
        ['DEMO_SCHEDULED', 'ONBOARDING'],
        ['ONBOARDING', 'TRIAL'],
      ] as const) {
        await request(app.getHttpServer())
          .patch(`/internal/leads/${created.body.id}/status`)
          .set('Authorization', `Bearer ${internalToken}`)
          .send({ status: to, reason: `Moving ${from} -> ${to}` })
          .expect(200);
      }
      await request(app.getHttpServer())
        .patch(`/internal/leads/${created.body.id}/status`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ status: 'CONVERTED', reason: 'Signed the agreement' })
        .expect(200);

      const converted = await prisma.outboxEvent.findMany({
        where: { eventName: 'facility-lead.converted' },
      });
      expect(converted).toHaveLength(1);
      expect(converted[0].aggregateId).toBe(created.body.id);
      expect(converted[0].idempotencyKey).toBe(
        `facility-lead.converted:${created.body.id}`,
      );
    });

    it('relay drain materializes the internal notification and the queue exposes delivery status', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD11');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      // Drive the outbox relay manually (the cron is disabled in tests) so
      // the listener materializes the internal notification. The relay does
      // not await async listeners, so poll briefly for the row.
      await outboxRelay.drain();
      let notification = await prisma.facilityLeadNotification.findFirst({
        where: { leadId: created.body.id, kind: 'LEAD_CREATED' },
      });
      for (let attempt = 0; !notification && attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        notification = await prisma.facilityLeadNotification.findFirst({
          where: { leadId: created.body.id, kind: 'LEAD_CREATED' },
        });
      }
      expect(notification).not.toBeNull();
      expect(notification?.status).toBe('DELIVERED');
      expect(notification?.channel).toBe('internal');
      const payload = notification?.payload as Record<string, unknown>;
      expect(payload).toMatchObject({
        leadId: created.body.id,
        facilityName: 'Sunrise Diagnostics',
        partnerName: 'E2E Partner RFR-E2ELD11',
        consentToFollowUp: true,
        // Per-lead deep link into the queue.
        deepLink: `/leads?lead=${created.body.id}`,
      });
      expect(payload.contactPhone).toBeUndefined();

      const queue = await request(app.getHttpServer())
        .get('/internal/leads')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(queue.body.items[0].notification).toMatchObject({
        kind: 'LEAD_CREATED',
        status: 'DELIVERED',
        recipientUserId: null,
        acknowledgedAt: null,
      });
    });
  });

  describe('notification acknowledgement and per-lead deep link', () => {
    it('acknowledges the notification as the acting operator and is idempotent', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD15');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      await outboxRelay.drain();
      let notification = await prisma.facilityLeadNotification.findFirst({
        where: { leadId: created.body.id, kind: 'LEAD_CREATED' },
      });
      for (let attempt = 0; !notification && attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        notification = await prisma.facilityLeadNotification.findFirst({
          where: { leadId: created.body.id, kind: 'LEAD_CREATED' },
        });
      }
      expect(notification).not.toBeNull();

      const ack = await request(app.getHttpServer())
        .post(`/internal/leads/${created.body.id}/notification/ack`)
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(201);
      expect(ack.body).toMatchObject({
        leadId: created.body.id,
        kind: 'LEAD_CREATED',
        status: 'DELIVERED',
        acknowledgedByUserId: internalUserId,
      });
      expect(typeof ack.body.acknowledgedAt).toBe('string');

      // The queue exposes the acknowledgement state.
      const queue = await request(app.getHttpServer())
        .get('/internal/leads')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(queue.body.items[0].notification).toMatchObject({
        acknowledgedByUserId: internalUserId,
      });
      expect(queue.body.items[0].notification.acknowledgedAt).not.toBeNull();

      // A second ack is a no-op that keeps the original acknowledger.
      const reAck = await request(app.getHttpServer())
        .post(`/internal/leads/${created.body.id}/notification/ack`)
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(201);
      expect(reAck.body.acknowledgedAt).toBe(ack.body.acknowledgedAt);
      expect(reAck.body.acknowledgedByUserId).toBe(internalUserId);
    });

    it('404s when the lead has no notification yet and rejects non-INTERNAL callers', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD16');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      // The relay has not drained, so no notification row exists yet.
      await request(app.getHttpServer())
        .post(`/internal/leads/${created.body.id}/notification/ack`)
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/internal/leads/${created.body.id}/notification/ack`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('narrows the queue to exactly the deep-linked lead', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD17');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      const byLead = await request(app.getHttpServer())
        .get(`/internal/leads?lead=${created.body.id}`)
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(byLead.body.items).toHaveLength(1);
      expect(byLead.body.items[0].id).toBe(created.body.id);

      const missing = await request(app.getHttpServer())
        .get('/internal/leads?lead=does-not-exist')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(missing.body.items).toHaveLength(0);
    });
  });

  describe('PATCH /internal/leads/:id/assign', () => {
    it('assigns an INTERNAL operator, records the audit entry, and re-targets the notification', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD12');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      // A second operator to receive the assignment.
      const assignee = await factories.user({ role: Role.INTERNAL });
      const assigneeId = assignee.user.id;

      // Materialize the created notification first (unassigned -> untargeted).
      await outboxRelay.drain();
      let notification = await prisma.facilityLeadNotification.findFirst({
        where: { leadId: created.body.id, kind: 'LEAD_CREATED' },
      });
      for (let attempt = 0; !notification && attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        notification = await prisma.facilityLeadNotification.findFirst({
          where: { leadId: created.body.id, kind: 'LEAD_CREATED' },
        });
      }
      expect(notification).not.toBeNull();
      expect(notification?.recipientUserId).toBeNull();

      const response = await request(app.getHttpServer())
        .patch(`/internal/leads/${created.body.id}/assign`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: assigneeId, reason: 'Kiran owns this region' })
        .expect(200);

      // The partner view stays clean; the audit entry is persisted.
      const row = await prisma.facilityLead.findUnique({
        where: { id: created.body.id },
        select: {
          ownerUserId: true,
          assignmentHistory: true,
          notifications: { select: { recipientUserId: true } },
        },
      });
      expect(row?.ownerUserId).toBe(assigneeId);
      expect(row?.assignmentHistory).toHaveLength(1);
      expect(
        (row?.assignmentHistory as Array<Record<string, unknown>>)[0],
      ).toMatchObject({
        fromUserId: null,
        toUserId: assigneeId,
        actorId: internalUserId,
      });
      expect(row?.notifications[0].recipientUserId).toBe(assigneeId);
      expect(response.body.status).toBe('SUBMITTED');

      // The internal queue exposes the assignment.
      const queue = await request(app.getHttpServer())
        .get('/internal/leads')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      expect(queue.body.items[0]).toMatchObject({
        id: created.body.id,
        ownerUserId: assigneeId,
        ownerName: assignee.user.name,
        notification: { recipientUserId: assigneeId },
      });
    });

    it('rejects a non-INTERNAL target user with 400 and writes nothing', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD13');
      const token = await obtainPartnerToken(PARTNER_PHONE);
      const created = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody())
        .expect(200);

      const admin = await factories.user({ role: Role.ADMIN });

      await request(app.getHttpServer())
        .patch(`/internal/leads/${created.body.id}/assign`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: admin.user.id })
        .expect(400);

      const row = await prisma.facilityLead.findUnique({
        where: { id: created.body.id },
        select: { ownerUserId: true },
      });
      expect(row?.ownerUserId).toBeNull();
    });

    it('rejects an assignment on an unknown lead with 404', async () => {
      const assignee = await factories.user({ role: Role.INTERNAL });
      await request(app.getHttpServer())
        .patch('/internal/leads/does-not-exist/assign')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: assignee.user.id })
        .expect(404);
    });
  });

  describe('GET /internal/operators', () => {
    it('lists INTERNAL operators only (never clinic staff)', async () => {
      const secondOperator = await factories.user({ role: Role.INTERNAL });

      const response = await request(app.getHttpServer())
        .get('/internal/operators')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);

      const ids = response.body.map(
        (operator: { id: string }) => operator.id,
      ) as string[];
      // Exactly the two INTERNAL users from this test: the beforeEach admin
      // (Role.ADMIN) is not an operator.
      expect(ids).toEqual(
        expect.arrayContaining([internalUserId, secondOperator.user.id]),
      );
      expect(ids).toHaveLength(2);
    });

    it('rejects a non-INTERNAL caller with 403', async () => {
      await request(app.getHttpServer())
        .get('/internal/operators')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('cross-partner duplicate review', () => {
    it('holds an exact facility match in DUPLICATE_REVIEW linked to the original instead of a 409', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD14');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      const first = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-dup000001' }))
        .expect(200);
      expect(first.body.status).toBe('SUBMITTED');

      // Exact same facility (name + address + phone) resubmitted with a
      // different key: accepted for review, not rejected.
      const second = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-dup000002' }))
        .expect(200);

      expect(second.body.status).toBe('DUPLICATE_REVIEW');
      expect(second.body.id).not.toBe(first.body.id);

      const copy = await prisma.facilityLead.findUnique({
        where: { id: second.body.id },
        select: {
          duplicateOfId: true,
          duplicateScore: true,
          fingerprint: true,
        },
      });
      expect(copy?.duplicateOfId).toBe(first.body.id);
      expect(copy?.duplicateScore).toBe(1);
      // The review copy carries no fingerprint: the unique index keeps one
      // real lead per facility.
      expect(copy?.fingerprint).toBeNull();

      // The original keeps its fingerprint (the unique owner).
      const original = await prisma.facilityLead.findUnique({
        where: { id: first.body.id },
        select: { fingerprint: true },
      });
      expect(original?.fingerprint).not.toBeNull();

      // The internal queue surfaces the duplicate link.
      const queue = await request(app.getHttpServer())
        .get('/internal/leads')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
      const queued = queue.body.items.find(
        (lead: { id: string }) => lead.id === second.body.id,
      );
      expect(queued).toMatchObject({
        status: 'DUPLICATE_REVIEW',
        duplicateScore: 1,
        duplicateOf: {
          id: first.body.id,
          facilityName: 'Sunrise Diagnostics',
        },
      });
    });

    it('keeps the DUPLICATE_ENTRY 409 for a same-phone but different-facility submit', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD15');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-dup000003' }))
        .expect(200);

      // Different facility name/address but the same contact phone: the
      // fingerprint differs, so the conservative phone conflict still 409s.
      const response = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(
          leadBody({
            facilityName: 'Sunrise Diagnostics Annex',
            address: '44 Other Road',
            idempotencyKey: 'lead-key-dup000004',
          }),
        )
        .expect(409);

      expect(response.body.code).toBe('DUPLICATE_ENTRY');
    });

    it('never creates two real leads for concurrent same-facility submits', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD16');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      // Two parallel submits of the same facility with different keys: the
      // fingerprint unique index guarantees exactly one winner; the loser is
      // re-routed to DUPLICATE_REVIEW (never a 500, never a second real lead).
      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .post('/partner/me/leads')
          .set('Authorization', `Bearer ${token}`)
          .send(leadBody({ idempotencyKey: 'lead-key-race000001' })),
        request(app.getHttpServer())
          .post('/partner/me/leads')
          .set('Authorization', `Bearer ${token}`)
          .send(leadBody({ idempotencyKey: 'lead-key-race000002' })),
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      const statuses = [first.body.status, second.body.status];
      expect(statuses).toContain('SUBMITTED');
      expect(statuses).toContain('DUPLICATE_REVIEW');

      const real = await prisma.facilityLead.count({
        where: { status: 'SUBMITTED' },
      });
      expect(real).toBe(1);
      const reviewed = await prisma.facilityLead.findMany({
        where: { status: 'DUPLICATE_REVIEW' },
        select: { duplicateOfId: true },
      });
      expect(reviewed).toHaveLength(1);
      const winner = await prisma.facilityLead.findFirst({
        where: { status: 'SUBMITTED' },
        select: { id: true },
      });
      expect(reviewed[0].duplicateOfId).toBe(winner?.id);
    });

    it('populates the duplicate score in the review copy notification payload', async () => {
      await seedPartner(PARTNER_PHONE, 'RFR-E2ELD17');
      const token = await obtainPartnerToken(PARTNER_PHONE);

      await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-dup000005' }))
        .expect(200);
      const copy = await request(app.getHttpServer())
        .post('/partner/me/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadBody({ idempotencyKey: 'lead-key-dup000006' }))
        .expect(200);

      await outboxRelay.drain();
      let notification = await prisma.facilityLeadNotification.findFirst({
        where: { leadId: copy.body.id, kind: 'LEAD_CREATED' },
      });
      for (let attempt = 0; !notification && attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        notification = await prisma.facilityLeadNotification.findFirst({
          where: { leadId: copy.body.id, kind: 'LEAD_CREATED' },
        });
      }
      expect(notification).not.toBeNull();
      const payload = notification?.payload as Record<string, unknown>;
      expect(payload.duplicateScore).toBe(1);
    });
  });
});

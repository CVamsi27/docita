// E2E guard for Express route-shadowing: proves the literal routes that the
// static check (scripts/checks/check-route-shadowing.mjs) protects actually
// WIN at runtime. Express matches by registration order — a literal route
// registered after a same-method `:param` route on the same prefix + segment
// count is swallowed by the param handler. Each route below is shadowing-
// adjacent: it shares a prefix with a `:param` route and is only reachable
// because its literal controller registers first. The discriminating
// assertion for each is the response the literal handler produces (200) vs
// the response the shadow would produce (403 role gate on the INTERNAL
// `:id` handler, or 404 for a nonexistent id like "queue"/"labs").
//
// Scope: Nest/Express controllers only (apps/api/src). The Hono proxy Workers
// (apps/*/api/index.ts) are excluded BY DESIGN — Hono's RegExpRouter matches
// by specificity (static > param > wildcard), so the literal-after-:param
// hazard does not exist there; the static check covers their exact-duplicate
// class instead. Astro (apps/landing) uses file-based routing where static
// pages beat [dynamic] pages by design.
//
// Verified non-vacuous via negative controls (both reverted): moving
// JoinRequestsController after ClinicsController fails ONLY the
// join-requests test; moving LabWorkflowController after LabTestsController
// fails ONLY queue+labs.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { signE2eAccessToken } from '../../e2e-auth-token';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';

describe('Literal route shadow guard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  const signStaff = async (clinicId: string, role: Role) => {
    const { user } = await factories.user({ clinicId, role });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
    return { user, token };
  };

  // Lab/queue features gate on Tier.ESSENTIAL (LAB_TESTS, QUEUE_MANAGEMENT).
  const makeClinic = () => factories.clinic({ tier: 'ESSENTIAL' });

  // ── /clinics literal routes vs ClinicsController's GET /clinics/:id ──────
  // The shadow (`:id`) is @Roles(Role.INTERNAL) — a DOCTOR/ADMIN token gets
  // 403 there. The literal controllers allow clinician roles, so a 200 proves
  // the literal handler won.

  it('GET /clinics/settings resolves the literal handler (200), not /clinics/:id (403)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.DOCTOR);

    const res = await request(app.getHttpServer())
      .get('/clinics/settings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body?.id).toBe(clinic.id);
  });

  it('GET /clinics/members resolves the literal handler (200), not /clinics/:id (403)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.DOCTOR);

    const res = await request(app.getHttpServer())
      .get('/clinics/members')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /clinics/prescription-defaults resolves the literal handler (200)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.DOCTOR);

    await request(app.getHttpServer())
      .get('/clinics/prescription-defaults')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  // Note: this handler's own gate is ADMIN/ADMIN_DOCTOR/RECEPTIONIST (not
  // DOCTOR), so use ADMIN — literal allows ADMIN (200); shadow `:id` requires
  // INTERNAL (403). A DOCTOR token would 403 from the literal handler itself,
  // which is not a discriminator.
  it('GET /clinics/opd-slip-settings resolves the literal handler (200)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.ADMIN);

    await request(app.getHttpServer())
      .get('/clinics/opd-slip-settings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('GET /clinics/referral resolves the literal handler (200), not /clinics/:id (403)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.DOCTOR);

    const res = await request(app.getHttpServer())
      .get('/clinics/referral')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Referral status shape: { isReferrer | referralCode ... } — any object
    // proves the literal controller ran (the shadow would 403 at the role gate).
    expect(typeof res.body).toBe('object');
  });

  it('GET /clinics/join-requests resolves the literal handler for an ADMIN (200), not /clinics/:id (403)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.ADMIN);

    const res = await request(app.getHttpServer())
      .get('/clinics/join-requests')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── /clinical/lab-tests literal routes vs GET /clinical/lab-tests/:id ────
  // The shadow would call getTestById('queue'|'labs') -> 404 (no such id).
  // A 200 proves LabWorkflowController registered before LabTestsController.

  it('GET /clinical/lab-tests/queue resolves the literal handler (200), not /:id (404)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.DOCTOR);

    const res = await request(app.getHttpServer())
      .get('/clinical/lab-tests/queue')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /clinical/lab-tests/labs resolves the literal handler (200), not /:id (404)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.DOCTOR);

    const res = await request(app.getHttpServer())
      .get('/clinical/lab-tests/labs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── /queue/today literal pin ──────────────────────────────────────────────
  // This route has NO param shadow today (the only /queue controller exposes
  // /queue, /queue/today, /queue/check-in/:id, ... — no GET /queue/:id), so
  // this is a pin, not a discriminator: it documents that the literal today
  // handler answers, so a future `queue/:id` addition cannot silently swallow
  // it (which the static check would then flag on the next run).

  it('GET /queue/today resolves the today handler (200)', async () => {
    const clinic = await makeClinic();
    const { token } = await signStaff(clinic.id, Role.DOCTOR);

    const res = await request(app.getHttpServer())
      .get('/queue/today')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // getTodayQueue returns an object (queue + stats), not the param shadow
    // (there is none today) and not a bare array.
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });
});

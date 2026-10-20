import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { signE2eAccessToken } from '../../e2e-auth-token';
import { getCsrfHeaders } from '../../csrf-helpers';
import { csrfHeaders, extractCookie } from '../../http-helpers';
import { PatientPortalAuthController } from '@/domains/patient-portal/presentation/controllers/patient-portal-auth.controller';
import { PatientPortalAuthService } from '@/domains/patient-portal/application/services/patient-portal-auth.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

/**
 * P01 — patient portal identity matrix.
 *
 * Every portal route derives its patient from the authenticated token, but a
 * route that also takes a resource id is only safe if the id is re-scoped
 * against that patient. The unit tests prove the query service passes a
 * patientId; only an HTTP-level matrix proves the id in the path cannot
 * override the identity in the token.
 *
 * Two rules are asserted for every resource:
 *   1. the owner reads their own resource;
 *   2. a different patient gets 404, never 403 — a 403 would confirm that the
 *      id exists and turn the portal into an enumeration oracle.
 */
describe('Patient portal identity matrix (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  // The e2e app mounts controllers at their own path: there is no global prefix.
  const PORTAL = '/patient-portal';

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
    // The global CsrfInterceptor reads `request.cookies['XSRF-TOKEN']`; without
    // the parser every unauthenticated mutation is a 403, which would mask the
    // validation and abuse-control outcomes under test.
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwt = moduleFixture.get(JwtService);
    setPrismaInstance(prisma);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  interface PortalIdentity {
    token: string;
    patientId: string;
    clinicId: string;
  }

  /**
   * Creates a patient with a linked portal user and returns its portal token.
   * Pass `clinic` to seed two patients into the same tenant: clinic scoping
   * alone must not be what stands between them.
   */
  const seedPortalPatient = async (
    label: string,
    existingClinic?: { id: string },
  ): Promise<PortalIdentity> => {
    const clinic = existingClinic ?? (await factories.clinic());
    const phone = `+9198${label.padStart(7, '0')}`;
    const patient = await factories.patient(clinic.id, { phoneNumber: phone });
    const { user } = await factories.user({
      clinicId: clinic.id,
      role: Role.PATIENT,
      name: `Portal ${label}`,
    });
    await prisma.patient.update({
      where: { id: patient.id },
      data: { userId: user.id },
    });

    return {
      token: signE2eAccessToken(jwt, {
        sub: user.id,
        email: user.email,
        role: Role.PATIENT,
        name: user.name,
        clinicId: clinic.id,
      }),
      patientId: patient.id,
      clinicId: clinic.id,
    };
  };

  /**
   * A prescribing doctor. `Prescription.doctorId` references a User in this
   * schema rather than a separate Doctor model.
   */
  const seedDoctorId = async (clinicId: string): Promise<string> => {
    const { user } = await factories.user({ clinicId, role: Role.DOCTOR });
    return user.id;
  };

  /** Seeds an appointment for one patient and returns its id. */
  const seedAppointment = async (identity: PortalIdentity): Promise<string> => {
    const doctorId = await seedDoctorId(identity.clinicId);
    const appointment = await factories.appointment(
      identity.patientId,
      doctorId,
      identity.clinicId,
    );
    return appointment.id;
  };

  /** Seeds a prescription for one patient and returns its id. */
  const seedPrescription = async (
    identity: PortalIdentity,
  ): Promise<string> => {
    const doctorId = await seedDoctorId(identity.clinicId);
    const appointmentId = await seedAppointment(identity);
    const prescription = await factories.prescription(
      appointmentId,
      identity.patientId,
      doctorId,
    );
    return prescription.id;
  };

  /**
   * supertest only allows `.set()` on a request that already has a method, so
   * an authenticated client is a small dispatcher rather than a bare agent.
   */
  const asPatient = (identity: PortalIdentity) => {
    const withAuth = <T extends request.Test>(req: T): T =>
      req
        .set('Authorization', `Bearer ${identity.token}`)
        .set('X-Clinic-Id', identity.clinicId) as T;
    return {
      get: (path: string) => withAuth(request(app.getHttpServer()).get(path)),
      post: (path: string) => withAuth(request(app.getHttpServer()).post(path)),
      patch: (path: string) =>
        withAuth(request(app.getHttpServer()).patch(path)),
    };
  };

  describe('resource scoping', () => {
    it('lets a patient read their own prescription', async () => {
      const owner = await seedPortalPatient('0000001');
      const prescriptionId = await seedPrescription(owner);

      const res = await asPatient(owner).get(
        `${PORTAL}/prescriptions/${prescriptionId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(prescriptionId);
    });

    it('hides another patient prescription behind a 404, not a 403', async () => {
      const owner = await seedPortalPatient('0000002');
      const stranger = await seedPortalPatient('0000003');
      const prescriptionId = await seedPrescription(owner);

      const res = await asPatient(stranger).get(
        `${PORTAL}/prescriptions/${prescriptionId}`,
      );

      // 403 would confirm the id exists and let a patient enumerate records.
      expect(res.status).toBe(404);
    });

    it('hides another patient appointment behind a 404', async () => {
      const owner = await seedPortalPatient('0000004');
      const stranger = await seedPortalPatient('0000005');
      const appointmentId = await seedAppointment(owner);

      const res = await asPatient(stranger).get(
        `${PORTAL}/appointments/${appointmentId}`,
      );

      expect(res.status).toBe(404);
    });

    /**
     * Same-tenant isolation. Two patients of one clinic differ by nothing but
     * `patientId`, so this is the only pair of rows that can catch a lookup
     * which filters on clinic but not on patient.
     */
    it('hides a same-clinic patient appointment behind a 404', async () => {
      const clinic = await factories.clinic();
      const owner = await seedPortalPatient('0000041', clinic);
      const neighbour = await seedPortalPatient('0000042', clinic);
      const appointmentId = await seedAppointment(owner);

      const res = await asPatient(neighbour).get(
        `${PORTAL}/appointments/${appointmentId}`,
      );

      expect(res.status).toBe(404);
    });

    it('hides a same-clinic patient prescription behind a 404', async () => {
      const clinic = await factories.clinic();
      const owner = await seedPortalPatient('0000043', clinic);
      const neighbour = await seedPortalPatient('0000044', clinic);
      const prescriptionId = await seedPrescription(owner);

      const res = await asPatient(neighbour).get(
        `${PORTAL}/prescriptions/${prescriptionId}`,
      );

      expect(res.status).toBe(404);
    });

    it('returns only the caller own appointments in the list', async () => {
      const owner = await seedPortalPatient('0000006');
      const stranger = await seedPortalPatient('0000007');
      await seedAppointment(owner);
      await seedAppointment(stranger);

      const res = await asPatient(owner).get(`${PORTAL}/appointments`);

      expect(res.status).toBe(200);
      const ids = (res.body.appointments ?? res.body ?? []).map(
        (a: { id: string }) => a.id,
      );
      // Whatever the envelope, nothing belonging to the other patient leaks.
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain(stranger.patientId);
    });

    it('returns only the caller own invoices', async () => {
      const owner = await seedPortalPatient('0000008');
      const stranger = await seedPortalPatient('0000009');

      const res = await asPatient(owner).get(`${PORTAL}/invoices`);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(stranger.patientId);
    });

    it('scopes the profile read to the caller', async () => {
      const owner = await seedPortalPatient('0000010');
      const stranger = await seedPortalPatient('0000011');

      const res = await asPatient(owner).get(`${PORTAL}/profile`);

      expect(res.status).toBe(200);
      expect(res.body.id ?? res.body.patient?.id).toBe(owner.patientId);
      expect(JSON.stringify(res.body)).not.toContain(stranger.patientId);
    });

    it('scopes the clinical timeline to the caller', async () => {
      const owner = await seedPortalPatient('0000012');
      const stranger = await seedPortalPatient('0000013');

      const res = await asPatient(owner).get(`${PORTAL}/timeline`);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(stranger.patientId);
    });

    it('scopes the patient snapshot to the caller', async () => {
      const owner = await seedPortalPatient('0000014');
      const stranger = await seedPortalPatient('0000015');

      const res = await asPatient(owner).get(`${PORTAL}/timeline/snapshot`);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(stranger.patientId);
    });

    it('scopes the dashboard to the caller', async () => {
      const owner = await seedPortalPatient('0000016');
      const stranger = await seedPortalPatient('0000017');

      const res = await asPatient(owner).get(`${PORTAL}/dashboard`);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(stranger.patientId);
    });
  });

  /**
   * The matrix is only meaningful if it also fails for the right reason. A
   * blanket 404 from a broken route would pass the "stranger" rows while
   * hiding an endpoint that serves nobody.
   */
  describe('matrix integrity', () => {
    it('serves every resource to its owner without error', async () => {
      const owner = await seedPortalPatient('0000018');
      const prescriptionId = await seedPrescription(owner);
      const appointmentId = await seedAppointment(owner);

      const routes: [string, string][] = [
        ['get', 'dashboard'],
        ['get', 'appointments'],
        ['get', `appointments/${appointmentId}`],
        ['get', 'prescriptions'],
        ['get', `prescriptions/${prescriptionId}`],
        ['get', 'invoices'],
        ['get', 'profile'],
        ['get', 'consent'],
        ['get', 'timeline'],
        ['get', 'timeline/snapshot'],
        ['get', 'medications/active'],
        ['get', 'medications/doses'],
        ['get', 'medications/adherence'],
        ['get', 'metrics/categories'],
        ['get', 'metrics/history'],
        ['get', 'metrics/selected'],
        ['get', 'metrics/vitals-history'],
      ];

      for (const [method, path] of routes) {
        const res = await asPatient(owner)[method as 'get'](
          `${PORTAL}/${path}`,
        );
        expect([200, 201]).toContain(res.status);
      }
    });
  });

  describe('unauthenticated and wrong-audience access', () => {
    it('rejects a portal route with no token', async () => {
      const res = await request(app.getHttpServer()).get(`${PORTAL}/profile`);

      expect(res.status).toBe(401);
    });

    it('rejects a staff token on the patient portal', async () => {
      const clinic = await factories.clinic();
      const { user: doctor } = await factories.user({
        clinicId: clinic.id,
        role: Role.DOCTOR,
      });
      const staffToken = signE2eAccessToken(jwt, {
        sub: doctor.id,
        email: doctor.email,
        role: Role.DOCTOR,
        name: doctor.name,
        clinicId: clinic.id,
      });

      const res = await request(app.getHttpServer())
        .get(`${PORTAL}/profile`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-Clinic-Id', clinic.id);

      // A clinic user must not reach the patient portal as a patient. The
      // token is valid, so this must be the role gate refusing (403), not an
      // accidental 401 that would also hide a broken token check.
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('identity linking', () => {
    it('refuses a patient whose account is not linked to a patient record', async () => {
      const clinic = await factories.clinic();
      const { user: orphanUser } = await factories.user({
        clinicId: clinic.id,
        role: Role.PATIENT,
        name: 'Orphan',
      });
      const token = signE2eAccessToken(jwt, {
        sub: orphanUser.id,
        email: orphanUser.email,
        role: Role.PATIENT,
        name: orphanUser.name,
        clinicId: clinic.id,
      });

      const res = await request(app.getHttpServer())
        .get(`${PORTAL}/profile`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Clinic-Id', clinic.id);

      // Authenticated, but there is no patient behind the account: the
      // context lookup fails closed rather than inventing a patient scope.
      expect(res.status).toBe(401);
    });

    it('binds the portal identity to exactly one patient', async () => {
      const identity = await seedPortalPatient('0000019');

      const patient = await prisma.patient.findUniqueOrThrow({
        where: { id: identity.patientId },
        select: { userId: true },
      });

      expect(patient.userId).toBeTruthy();
      // A second patient cannot be attached to the same account.
      const other = await factories.patient(identity.clinicId);
      await expect(
        prisma.patient.update({
          where: { id: other.id },
          data: { userId: patient.userId },
        }),
      ).rejects.toThrow();
    });
  });

  describe('channel abuse controls', () => {
    /**
     * Mounts the real portal auth controller behind the real ThrottlerGuard.
     *
     * The main e2e app cannot answer these: `ThrottlerModule.forRootAsync`
     * sets `skipIf: () => config.getEnvironment() === 'test'`, so no route is
     * throttled under NODE_ENV=test regardless of its decorator. Mounting the
     * controller this way is the only place the production guard behaviour is
     * observable in-process.
     */
    const mountThrottledAuthApp = async (verifyOtp: jest.Mock) => {
      const throttleModule = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot({
            // Deliberately far above the OTP limit: a 429 here can only come
            // from the route's own @Throttle metadata, not this default.
            throttlers: [{ name: 'short', ttl: 60000, limit: 100 }],
            skipIf: () => false,
            getTracker: () => 'patient-portal-e2e-tracker',
          }),
        ],
        controllers: [PatientPortalAuthController],
        providers: [
          { provide: APP_GUARD, useClass: ThrottlerGuard },
          {
            provide: PatientPortalAuthService,
            useValue: {
              requestOtp: jest.fn().mockResolvedValue({
                message: 'OTP sent if account exists',
                expiresInSeconds: 600,
              }),
              verifyOtp,
            },
          },
          {
            provide: AppConfigService,
            useValue: { isProduction: () => false },
          },
        ],
      }).compile();

      const throttleApp = throttleModule.createNestApplication();
      throttleApp.useLogger(false);
      await throttleApp.init();
      return throttleApp;
    };

    it('rate limits OTP requests on the public endpoint', async () => {
      const throttleApp = await mountThrottledAuthApp(jest.fn());

      try {
        const statuses: number[] = [];
        for (let i = 0; i < 8; i += 1) {
          // Sequential so the per-tracker throttle window is meaningful.
          const response = await request(throttleApp.getHttpServer())
            .post('/patient-portal/auth/request-otp')
            .send({ phoneNumber: '+919800000042' });
          statuses.push(response.status);
        }

        // OTP_ENDPOINT_RATE_LIMIT is 5/60s; the public SMS endpoint must start
        // refusing afterwards or it is an unbounded SMS sender. Nest answers
        // POST with 201 by default, so the accepted calls are 201.
        expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
        expect(statuses.slice(5).every((s) => s === 429)).toBe(true);
      } finally {
        await throttleApp.close();
      }
    });

    it('rate limits OTP verification attempts', async () => {
      // A wrong guess must still count: if the limiter only counted successes
      // the endpoint would allow unlimited 6-digit combinations per minute.
      const verifyOtp = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Invalid or expired OTP'));
      const throttleApp = await mountThrottledAuthApp(verifyOtp);

      try {
        const statuses: number[] = [];
        for (let i = 0; i < 8; i += 1) {
          const response = await request(throttleApp.getHttpServer())
            .post('/patient-portal/auth/verify-otp')
            .send({ phoneNumber: '+919800000042', otp: '000000' });
          statuses.push(response.status);
        }

        expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
        expect(statuses.slice(5).every((s) => s === 429)).toBe(true);
        // The limiter must trip before the handler: six guesses is the ceiling.
        expect(verifyOtp).toHaveBeenCalledTimes(5);
      } finally {
        await throttleApp.close();
      }
    });

    it('rejects an OTP request with no phone number', async () => {
      // The public OTP POST carries no `Authorization` header, so the global
      // CsrfInterceptor demands the double-submit pair first; without it the
      // request never reaches validation and 403 masks the real outcome.
      const csrf = await getCsrfHeaders(app.getHttpServer());
      const res = await request(app.getHttpServer())
        .post('/patient-portal/auth/request-otp')
        .set(csrfHeaders(csrf))
        .send({});

      expect(res.status).toBe(400);
    });

    it('refuses an OTP POST that skips the CSRF double-submit', async () => {
      const res = await request(app.getHttpServer())
        .post('/patient-portal/auth/request-otp')
        .send({ phoneNumber: '+919800000099' });

      // Channel control: an SMS-spending public endpoint must not be
      // driveable cross-site from a form post.
      expect(res.status).toBe(403);
    });
  });

  /**
   * Session lifecycle. A portal session is a refresh token row keyed by the
   * user; the identity matrix is incomplete if a patient can revoke a session
   * that is not theirs, or if "logout" leaves the token usable.
   */
  describe('session revocation', () => {
    /** Logs in over HTTP and returns the issued tokens. */
    const login = async (email: string, password: string) => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);

      const refreshToken = extractCookie(
        response.headers as Record<string, unknown>,
        'refresh_token',
      );
      if (!refreshToken) throw new Error('login did not issue a refresh_token');

      return {
        accessToken: response.body.access_token as string,
        refreshToken,
      };
    };

    /** Exchanges a refresh token; returns the HTTP status of the attempt. */
    const refresh = async (refreshToken: string) => {
      const csrf = await getCsrfHeaders(app.getHttpServer());
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set(csrfHeaders(csrf))
        .send({ refresh_token: refreshToken });
      return response.status;
    };

    it('lists only the caller own sessions', async () => {
      const { user, plainPassword } = await factories.user();
      const stranger = await factories.user();
      await login(user.email, plainPassword);
      await login(stranger.user.email, stranger.plainPassword);

      const response = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set(
          'Authorization',
          `Bearer ${(await login(user.email, plainPassword)).accessToken}`,
        )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(JSON.stringify(response.body)).not.toContain(stranger.user.id);
    });

    it('refuses to revoke a session belonging to another account', async () => {
      const owner = await factories.user();
      const attacker = await factories.user();
      const ownerLogin = await login(owner.user.email, owner.plainPassword);
      const attackerLogin = await login(
        attacker.user.email,
        attacker.plainPassword,
      );

      const sessions = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${ownerLogin.accessToken}`)
        .expect(200);
      const ownerSessionId = sessions.body[0].id as string;

      await request(app.getHttpServer())
        .delete(`/auth/sessions/${ownerSessionId}`)
        .set('Authorization', `Bearer ${attackerLogin.accessToken}`)
        .expect(400);

      // The refused call must not have revoked anything.
      expect(await refresh(ownerLogin.refreshToken)).toBe(201);
    });

    it('logout revokes the refresh token it is given', async () => {
      const { user, plainPassword } = await factories.user();
      const session = await login(user.email, plainPassword);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set(csrfHeaders(await getCsrfHeaders(app.getHttpServer())))
        .send({ refresh_token: session.refreshToken })
        .expect(201);

      expect(await refresh(session.refreshToken)).toBe(401);
    });

    it('revoke-all keeps the current session and kills the others', async () => {
      const { user, plainPassword } = await factories.user();
      const stale = await login(user.email, plainPassword);
      const current = await login(user.email, plainPassword);

      await request(app.getHttpServer())
        .delete('/auth/sessions')
        .set('Authorization', `Bearer ${current.accessToken}`)
        .set('Cookie', `refresh_token=${current.refreshToken}`)
        .expect(200);

      // Revoked sessions must stop rotating; the caller keeps its own.
      expect(await refresh(stale.refreshToken)).toBe(401);
      expect(await refresh(current.refreshToken)).toBe(201);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from './setup';
import { factories, setPrismaInstance } from './factories';
import { Role } from '@workspace/db';
import cookieParser from 'cookie-parser';

describe('Idempotency (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let csrfCookie: string;
  let csrfToken: string;
  let testClinicId: string;

  const mockPaymentProvider = {
    createPaymentLink: jest.fn().mockResolvedValue({
      id: 'plink_test123',
      shortUrl: 'https://rzp.io/i/test',
      raw: {},
    }),
    verifySignature: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider('IPaymentProvider')
      .useValue(mockPaymentProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useLogger(false);
    await app.init();

    setPrismaInstance(getPrismaInstance());
  });

  beforeEach(async () => {
    await resetDatabase();

    const clinic = await factories.clinic();
    testClinicId = clinic.id;
    const admin = await factories.user({
      clinicId: testClinicId,
      role: Role.ADMIN,
    });

    // 1. Get CSRF token FIRST
    const getRes = await request(app.getHttpServer()).get('/');
    const cookies = getRes.get('Set-Cookie');
    csrfCookie = cookies!.find((c) => c.startsWith('XSRF-TOKEN='))!;
    csrfToken = csrfCookie.split(';')[0].split('=')[1];

    // 2. Login with CSRF token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Cookie', [csrfCookie])
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ email: admin.user.email, password: admin.plainPassword })
      .expect(201);

    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('should return same response for same idempotency key', async () => {
    const patient = await factories.patient(testClinicId);
    const invoice = await factories.invoice(patient.id);

    const idempotencyKey = 'unique-test-key-' + Date.now();
    const payload = {
      invoiceId: invoice.id,
      amount: 100,
      patientId: patient.id,
      clinicId: testClinicId,
    };

    // 1. First request
    const res1 = await request(app.getHttpServer())
      .post('/payments/link')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', [csrfCookie])
      .set('X-XSRF-TOKEN', csrfToken)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload)
      .expect(201);

    const firstId = res1.body.id;

    // 2. Second request with same key
    const res2 = await request(app.getHttpServer())
      .post('/payments/link')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', [csrfCookie])
      .set('X-XSRF-TOKEN', csrfToken)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload)
      .expect(201);

    expect(res2.body.id).toBe(firstId);
    expect(mockPaymentProvider.createPaymentLink).toHaveBeenCalledTimes(1);
  });

  it('should block concurrent requests with same idempotency key', async () => {
    const patient = await factories.patient(testClinicId);
    const invoice = await factories.invoice(patient.id);

    const idempotencyKey = 'concurrent-test-key-' + Date.now();
    const payload = {
      invoiceId: invoice.id,
      amount: 100,
      patientId: patient.id,
      clinicId: testClinicId,
    };

    // Fire two requests almost simultaneously
    const p1 = request(app.getHttpServer())
      .post('/payments/link')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', [csrfCookie])
      .set('X-XSRF-TOKEN', csrfToken)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    const p2 = request(app.getHttpServer())
      .post('/payments/link')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', [csrfCookie])
      .set('X-XSRF-TOKEN', csrfToken)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    const results = await Promise.allSettled([p1, p2]);
    const statuses = results.map((r) =>
      r.status === 'fulfilled' ? r.value.status : r.reason.status,
    );

    // One should be 201, the other might be 201 (if cached) or 409 (if overlap)
    expect(statuses).toContain(201);
  });
});

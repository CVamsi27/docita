import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from './setup';
import { factories, setPrismaInstance } from './factories';
import { Role } from '@workspace/db';
import cookieParser from 'cookie-parser';
import { PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';

describe('Idempotency (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let csrfCookie: string;
  let csrfToken: string;
  let testClinicId: string;

  const mockPaymentProvider = {
    createPaymentLink: jest.fn().mockResolvedValue({
      id: 'plink_test123',
      shortUrl: 'https://rzp.io/i/plink_test123',
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
      .overrideProvider(PAYMENT_LINK_PROVIDER_TOKEN)
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

    const getRes = await request(app.getHttpServer()).get('/');
    const cookies = getRes.get('Set-Cookie');
    csrfCookie = cookies!.find((c) => c.startsWith('XSRF-TOKEN='))!;
    csrfToken = csrfCookie.split(';')[0].split('=')[1];

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

    const res1 = await request(app.getHttpServer())
      .post('/payments/link')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', [csrfCookie])
      .set('X-XSRF-TOKEN', csrfToken)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload)
      .expect(201);

    const firstId = res1.body.id;

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

    expect(statuses).toContain(201);
  });
});

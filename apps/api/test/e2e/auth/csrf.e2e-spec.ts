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
} from '../../setup';
import { setPrismaInstance } from '../../factories';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';

async function fetchCsrfToken(server: string) {
  const response = await request(server)
    .get(`/health?csrfProbe=${randomUUID()}`)
    .expect(200);

  const cookies = response.get('Set-Cookie') ?? [];
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
  if (!csrfCookie) throw new Error('XSRF-TOKEN cookie was not issued');

  const token = csrfCookie.split(';')[0]?.split('=')[1];
  if (!token) throw new Error('XSRF-TOKEN cookie did not contain a token');

  return { cookies, token };
}

describe('CSRF Protection (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useLogger(false);
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('should set XSRF-TOKEN cookie on GET request', async () => {
    const { cookies } = await fetchCsrfToken(app.getHttpServer());
    expect(cookies.some((cookie) => cookie.startsWith('XSRF-TOKEN='))).toBe(
      true,
    );
  });

  it('should allow first-touch auth POST requests without X-XSRF-TOKEN header', async () => {
    const { token } = await fetchCsrfToken(app.getHttpServer());

    await request(app.getHttpServer())
      .post('/auth/check-email')
      .set('Cookie', [`XSRF-TOKEN=${token}`])
      .send({ email: 'test@test.com' })
      .expect(201);
  });

  it('should allow POST request with valid X-XSRF-TOKEN header', async () => {
    const { token } = await fetchCsrfToken(app.getHttpServer());

    await request(app.getHttpServer())
      .post('/auth/check-email')
      .set('Cookie', [`XSRF-TOKEN=${token}`])
      .set('X-XSRF-TOKEN', token)
      .send({ email: 'test@test.com' })
      .expect(201);
  });
});

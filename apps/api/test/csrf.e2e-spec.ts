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
import { _factories, setPrismaInstance } from './factories';
import cookieParser from 'cookie-parser';

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
    const response = await request(app.getHttpServer()).get('/');

    const cookies = response.get('Set-Cookie');
    expect(cookies).toBeDefined();
    expect(cookies!.some((c) => c.startsWith('XSRF-TOKEN='))).toBe(true);
  });

  it('should block POST request without X-XSRF-TOKEN header', async () => {
    const getRes = await request(app.getHttpServer()).get('/');
    const cookies = getRes.get('Set-Cookie');
    const csrfCookie = cookies!.find((c) => c.startsWith('XSRF-TOKEN='));
    const tokenValue = csrfCookie!.split(';')[0].split('=')[1];

    await request(app.getHttpServer())
      .post('/auth/check-email')
      .set('Cookie', [`XSRF-TOKEN=${tokenValue}`])
      .send({ email: 'test@test.com' })
      .expect(403);
  });

  it('should allow POST request with valid X-XSRF-TOKEN header', async () => {
    const getRes = await request(app.getHttpServer()).get('/');
    const cookies = getRes.get('Set-Cookie');
    const csrfCookie = cookies!.find((c) => c.startsWith('XSRF-TOKEN='));
    const tokenValue = csrfCookie!.split(';')[0].split('=')[1];

    await request(app.getHttpServer())
      .post('/auth/check-email')
      .set('Cookie', [`XSRF-TOKEN=${tokenValue}`])
      .set('X-XSRF-TOKEN', tokenValue)
      .send({ email: 'test@test.com' })
      .expect(201);
  });
});

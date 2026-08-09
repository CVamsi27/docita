import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';

describe('Join Clinic Search Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    setPrismaInstance(moduleFixture.get<PrismaService>(PrismaService));
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  it('lets a no-clinic user search active clinics and resolves the literal search-for-join route', async () => {
    const now = Date.now();
    const searchableName = `JoinMe Clinic ${now}`;
    const clinic = await factories.clinic({
      name: searchableName,
      email: `joinme.${now}@test.com`,
      active: true,
    });
    const inactiveClinic = await factories.clinic({
      name: `Inactive Clinic ${now}`,
      email: `inactive.${now}@test.com`,
      active: false,
    });

    // A fresh registrant has role DOCTOR, no clinicId, and onboardingStep
    // CHOOSE_PATH — exactly the user this flow serves.
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        firstName: 'Join',
        lastName: 'Seeker',
        email: `join.seeker.${now}@test.com`,
        password: 'Test@123456',
      })
      .expect(201);

    const token =
      registerResponse.body?.access_token || registerResponse.body?.accessToken;
    expect(token).toBeDefined();

    // Route-registration guard: ClinicSettingsController (hosting this literal
    // route) is registered FIRST in ClinicsModule's controllers array (before
    // ClinicsController) so /clinics/search-for-join wins over
    // ClinicsController's /clinics/:id (INTERNAL role gate). Cross-module
    // app.module order cannot fix this — the AuthModule forwardRef cycle pulls
    // ClinicsModule into the Nest container before ClinicsSettingsModule is
    // scanned. If the literal controller moves after ClinicsController, this
    // 200 becomes 403.
    const searchResponse = await request(app.getHttpServer())
      .get('/clinics/search-for-join')
      .query({ query: searchableName })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(searchResponse.body)).toBe(true);
    const results = searchResponse.body as Array<{
      id: string;
      name: string;
      canJoin: boolean;
      existingRequestStatus: string | null;
    }>;
    expect(results.length).toBeGreaterThan(0);
    const match = results.find((r) => r.id === clinic.id);
    expect(match).toBeDefined();
    expect(match?.name).toBe(searchableName);
    expect(match?.canJoin).toBe(true);
    expect(match?.existingRequestStatus).toBeNull();
    // Inactive clinics must never surface in the search.
    expect(results.some((r) => r.id === inactiveClinic.id)).toBe(false);

    // Empty query returns an empty list (controller short-circuit).
    const emptyResponse = await request(app.getHttpServer())
      .get('/clinics/search-for-join')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(emptyResponse.body).toEqual([]);
  });

  it('submits and retrieves a join request for the searched clinic', async () => {
    const now = Date.now();
    const clinic = await factories.clinic({
      name: `JoinTarget ${now}`,
      email: `jointarget.${now}@test.com`,
      active: true,
    });

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        firstName: 'Join',
        lastName: 'Requestor',
        email: `join.requestor.${now}@test.com`,
        password: 'Test@123456',
      })
      .expect(201);

    const token =
      registerResponse.body?.access_token || registerResponse.body?.accessToken;
    expect(token).toBeDefined();

    const createResponse = await request(app.getHttpServer())
      .post('/clinics/join-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clinicId: clinic.id,
        requestedRole: 'DOCTOR',
        message: 'Please add me to the team',
      })
      .expect(200);

    expect(createResponse.body?.success).toBe(true);
    expect(createResponse.body?.requestId).toBeDefined();

    const mineResponse = await request(app.getHttpServer())
      .get('/clinics/join-requests/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mineResponse.body).not.toBeNull();
    expect(mineResponse.body?.clinicId).toBe(clinic.id);
    expect(mineResponse.body?.status).toBe('PENDING');

    // A second search now marks the clinic as having a pending request.
    const searchResponse = await request(app.getHttpServer())
      .get('/clinics/search-for-join')
      .query({ query: clinic.name })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const match = (
      searchResponse.body as Array<{
        id: string;
        canJoin: boolean;
        existingRequestStatus: string | null;
      }>
    ).find((r) => r.id === clinic.id);
    expect(match?.canJoin).toBe(false);
    expect(match?.existingRequestStatus).toBe('PENDING');
  });
});

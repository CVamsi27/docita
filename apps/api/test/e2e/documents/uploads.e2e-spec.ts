import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { expectMatchesSchema } from '../../contract-assertions';
import { getCsrfHeaders } from '../../csrf-helpers';
import {
  uploadSessionContractResponseSchema,
  uploadSessionCreateContractResponseSchema,
} from '@workspace/types';

/**
 * QR/mobile uploads carry no Authorization header (only X-Upload-Secret), so
 * the global CSRF double-submit interceptor applies. Mint a token from /health
 * and echo it as Cookie + X-XSRF-TOKEN, exactly like the real app client does.
 */

/** Minimal 1x1 transparent PNG — valid PNG magic bytes (89 50 4E 47 ...). */
const VALID_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * P4.3 — file upload and access (upload sessions).
 *
 * Covers the QR/mobile upload flow: JWT-authenticated session creation,
 * secret-authenticated multipart upload with content-signature (magic byte)
 * and extension/MIME validation, one-time-use semantics, and access control
 * on the session query surface.
 */
describe('Upload sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let doctorToken: string;

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
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();

    const clinic = await factories.clinic();
    const { user, plainPassword } = await factories.user({
      clinicId: clinic.id,
      role: 'DOCTOR',
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword })
      .expect(201);
    doctorToken = loginRes.body.access_token as string;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  const createSession = async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads/session')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(201);
    return {
      id: res.body.id as string,
      uploadSecret: res.body.uploadSecret as string,
    };
  };

  /** Secret-authenticated upload: mirrors the QR/mobile path (no JWT). */
  const uploadWithSecret = async (
    params: {
      id: string;
      uploadSecret: string;
      buffer: Buffer;
      filename: string;
      contentType: string;
    },
    expectedStatus?: number,
  ) => {
    const csrf = await getCsrfHeaders(app.getHttpServer());
    const test = request(app.getHttpServer())
      .post(`/uploads/session/${params.id}`)
      .set('Cookie', [csrf.cookie])
      .set('X-XSRF-TOKEN', csrf.token)
      .set('X-Upload-Secret', params.uploadSecret)
      .attach('file', params.buffer, {
        filename: params.filename,
        contentType: params.contentType,
      });
    return expectedStatus === undefined ? test : test.expect(expectedStatus);
  };

  it('creates an upload session under the shared Zod contract', async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads/session')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(201);

    const parsed = expectMatchesSchema(
      uploadSessionCreateContractResponseSchema,
      res.body,
    );
    expect(parsed.id).toBeTruthy();
    expect(parsed.uploadSecret).toBeTruthy();
    expect(parsed.status).toBe('pending');
  });

  it('uploads a valid PNG with the session secret and exposes the stored file URL', async () => {
    const { id, uploadSecret } = await createSession();

    await uploadWithSecret(
      {
        id,
        uploadSecret,
        buffer: VALID_PNG_BUFFER,
        filename: 'test.png',
        contentType: 'image/png',
      },
      201,
    );

    const session = await request(app.getHttpServer())
      .get(`/uploads/session/${id}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    const parsed = expectMatchesSchema(
      uploadSessionContractResponseSchema,
      session.body,
    );
    expect(parsed.status).toBe('uploaded');
    expect(parsed.fileUrl).toMatch(/^\/uploads\/documents\//);
  });

  it('rejects a reused upload link with 400 (one-time use)', async () => {
    const { id, uploadSecret } = await createSession();

    await uploadWithSecret(
      {
        id,
        uploadSecret,
        buffer: VALID_PNG_BUFFER,
        filename: 'test.png',
        contentType: 'image/png',
      },
      201,
    );

    await uploadWithSecret(
      {
        id,
        uploadSecret,
        buffer: VALID_PNG_BUFFER,
        filename: 'test.png',
        contentType: 'image/png',
      },
      400,
    );
  });

  it('rejects an upload with an invalid secret with 401', async () => {
    const { id } = await createSession();

    await uploadWithSecret(
      {
        id,
        uploadSecret: 'wrong-secret',
        buffer: VALID_PNG_BUFFER,
        filename: 'test.png',
        contentType: 'image/png',
      },
      401,
    );
  });

  it('rejects a file whose content does not match the declared image type (magic bytes)', async () => {
    const { id, uploadSecret } = await createSession();

    await uploadWithSecret(
      {
        id,
        uploadSecret,
        buffer: Buffer.from('this is not an image at all'),
        filename: 'fake.png',
        contentType: 'image/png',
      },
      400,
    );
  });

  it('rejects a mismatched extension vs declared MIME type', async () => {
    const { id, uploadSecret } = await createSession();

    await uploadWithSecret(
      {
        id,
        uploadSecret,
        buffer: VALID_PNG_BUFFER,
        filename: 'test.jpg',
        contentType: 'image/png',
      },
      400,
    );
  });

  it('requires authentication to read a session', async () => {
    const { id } = await createSession();

    await request(app.getHttpServer())
      .get(`/uploads/session/${id}`)
      .expect(401);
  });

  it('returns 404 for an unknown session', async () => {
    await request(app.getHttpServer())
      .get('/uploads/session/does-not-exist')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(404);
  });
});

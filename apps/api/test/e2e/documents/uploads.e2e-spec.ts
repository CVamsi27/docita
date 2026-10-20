import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication } from '@nestjs/common';
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
import { UploadsCommandService } from '@/domains/documents/application/services/uploads-command.service';
import {
  StorageProvider,
  type StorageFile,
} from '@/domains/documents/application/ports/storage-provider.port';
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

  it('elects exactly one winner when two uploads race for the same link', async () => {
    const { id, uploadSecret } = await createSession();

    const [first, second] = await Promise.all([
      uploadWithSecret({
        id,
        uploadSecret,
        buffer: VALID_PNG_BUFFER,
        filename: 'race-a.png',
        contentType: 'image/png',
      }),
      uploadWithSecret({
        id,
        uploadSecret,
        buffer: VALID_PNG_BUFFER,
        filename: 'race-b.png',
        contentType: 'image/png',
      }),
    ]);

    // The conditional single-use claim must serialize the race: one 201 and
    // one controlled 400, never two published files.
    expect([first.status, second.status].sort((a, b) => a - b)).toEqual([
      201, 400,
    ]);

    const session = await request(app.getHttpServer())
      .get(`/uploads/session/${id}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    expect(session.body.status).toBe('uploaded');
    expect(session.body.fileUrl).toMatch(/^\/uploads\/documents\//);
  });

  it('serializes concurrent uploads for one link at the claim (barrier race)', async () => {
    const uploads = app.get(UploadsCommandService);
    const storage = app.get(StorageProvider);
    const session = await uploads.createSession();

    // Hold both requests after validation but before the claim, so the race
    // deterministically reaches the conditional UPDATE instead of depending
    // on scheduler timing.
    let arrived = 0;
    let releaseGate: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    let uploadCount = 0;
    const uploadSpy = jest
      .spyOn(storage, 'upload')
      .mockImplementation(async () => {
        uploadCount += 1;
        const objectUrl = `/stored/race-${uploadCount}.png`;
        arrived += 1;
        if (arrived === 2) releaseGate();
        await gate;
        return objectUrl;
      });
    const deleteSpy = jest
      .spyOn(storage, 'delete')
      .mockResolvedValue(undefined);

    const file: StorageFile = {
      fieldname: 'file',
      originalname: 'race.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 10,
      buffer: Buffer.from('x'),
    };

    const results = await Promise.allSettled([
      uploads.updateSession(session.id, file, {
        uploadSecret: session.uploadSecret,
      }),
      uploads.updateSession(session.id, file, {
        uploadSecret: session.uploadSecret,
      }),
    ]);

    try {
      const fulfilled = results.filter(
        (result) => result.status === 'fulfilled',
      );
      const rejected = results.filter((result) => result.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      if (rejected[0].status === 'rejected') {
        expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      }

      // The loser removes the object it uploaded before failing.
      expect(deleteSpy).toHaveBeenCalledTimes(1);

      const row = await prisma.uploadSession.findUnique({
        where: { id: session.id },
      });
      expect(row?.status).toBe('uploaded');
      expect(row?.fileUrl).toMatch(/^\/stored\/race-/);
    } finally {
      uploadSpy.mockRestore();
      deleteSpy.mockRestore();
    }
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

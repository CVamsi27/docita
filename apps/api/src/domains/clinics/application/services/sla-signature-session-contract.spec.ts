import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import assert from 'node:assert/strict';
import {
  slaSignatureSessionStatusResponseSchema,
  uploadSessionContractResponseSchema,
  uploadSessionCreateContractResponseSchema,
} from '@workspace/types';
import { z } from 'zod';
import {
  createSlaSignatureSession,
  getSlaSignatureSessionStatus,
  uploadSlaSignature,
} from './onboarding/onboarding-helpers';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';
import type { ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import { OnboardingSlaSignatureController } from '@/domains/clinics/presentation/controllers/onboarding-sla-signature.controller';
import { SafeZodSerializerInterceptor } from '@/shared/common/interceptors/safe-zod-serializer.interceptor';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';

const NOW = new Date('2026-07-04T10:00:00.000Z');
const SESSION_ID = 'ups-1';

/** The SPA receives JSON, not the in-process objects these helpers return. */
function overTheWire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

/** The row `UploadsService.createSession` spreads before adding the secret. */
function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    status: 'pending',
    fileUrl: null,
    purpose: 'GENERAL',
    doctorId: null,
    uploadSecretHash: 'a'.repeat(64),
    createdAt: new Date('2026-07-04T09:40:00.000Z'),
    expiresAt: new Date('2026-07-04T10:00:00.000Z'),
    ...overrides,
  };
}

function makeUploadsService() {
  return {
    createSession: jest.fn(async () => ({
      ...makeSessionRow(),
      uploadSecret: 'plaintext-secret',
    })),
    updateSession: jest.fn(async () => ({
      id: SESSION_ID,
      status: 'uploaded',
      fileUrl: 'https://cdn.example.com/signature.png',
      purpose: 'GENERAL',
      doctorId: null,
      createdAt: new Date('2026-07-04T09:40:00.000Z'),
      expiresAt: new Date('2026-07-04T10:00:00.000Z'),
    })),
  } as unknown as UploadsService;
}

function makePersistence(session: Record<string, unknown> | null) {
  return {
    uploadSession: {
      findUnique: jest.fn(async () => session),
      update: jest.fn(async () => ({ ...(session ?? {}) })),
    },
  } as unknown as ClinicPersistencePort;
}

const FILE = {
  originalname: 'signature.png',
  mimename: 'signature.png',
  mimetype: 'image/png',
  size: 1024,
} as unknown as Express.Multer.File;

/**
 * Contract parity for the three `@Public()` onboarding signature routes.
 *
 * Every one of them is reached from a link in an onboarding email with no
 * session to authenticate, and every one of them was unverified: the status
 * route declared its response inline on the server and as three optional fields
 * on the SPA — so `{}` satisfied the client type and a status endpoint that
 * stopped answering read as "not uploaded yet" forever.
 *
 * The create route also had no serializer, so it returned the whole
 * `UploadSession` row that `UploadsService.createSession` builds. That row
 * carries `uploadSecretHash`; the authenticated `/uploads/session` route has
 * always trimmed it through `@ZodSerializerDto`, and this one did not.
 */
describe('onboarding signature session contract parity', () => {
  describe('POST /onboarding/:id/sla-signature-session', () => {
    let uploadsService: UploadsService;

    beforeEach(() => {
      uploadsService = makeUploadsService();
    });

    it('parses the session the helper creates', async () => {
      const raw = await createSlaSignatureSession('onb-1', uploadsService);

      const parsed = uploadSessionCreateContractResponseSchema.parse(
        overTheWire(raw),
      );
      expect(parsed.id).toBe(SESSION_ID);
      expect(parsed.uploadSecret).toBe('plaintext-secret');
      expect(parsed.status).toBe('pending');
      expect(parsed.expiresAt).toBe('2026-07-04T10:00:00.000Z');
    });

    it('issues a 20-minute GENERAL-purpose session', async () => {
      await createSlaSignatureSession('onb-1', uploadsService);

      expect(uploadsService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ expiresInMinutes: 20, purpose: 'GENERAL' }),
      );
    });

    it('carries a secret hash the serializer has to strip', async () => {
      const raw = await createSlaSignatureSession('onb-1', uploadsService);

      // The raw payload really does carry it — that is why the route needs the
      // serializer rather than trusting the projection.
      expect((raw as Record<string, unknown>).uploadSecretHash).toBe(
        'a'.repeat(64),
      );
      const serialized = uploadSessionCreateContractResponseSchema.parse(
        overTheWire(raw),
      );
      expect(serialized).not.toHaveProperty('uploadSecretHash');
    });
  });

  describe('GET /onboarding/:id/sla-signature-session/:sessionId/status', () => {
    it('parses a pending session', async () => {
      const raw = await getSlaSignatureSessionStatus(
        makePersistence(makeSessionRow({ status: 'pending', fileUrl: null })),
        'onb-1',
        SESSION_ID,
      );

      const parsed = slaSignatureSessionStatusResponseSchema.parse(
        overTheWire(raw),
      );
      expect(parsed).toEqual({
        status: 'pending',
        uploaded: false,
        fileUrl: null,
      });
    });

    it('parses a session that already has a file', async () => {
      const raw = await getSlaSignatureSessionStatus(
        makePersistence(
          makeSessionRow({
            status: 'pending',
            fileUrl: 'https://cdn.example.com/signature.png',
          }),
        ),
        'onb-1',
        SESSION_ID,
      );

      const parsed = slaSignatureSessionStatusResponseSchema.parse(
        overTheWire(raw),
      );
      // `uploaded` is derived from either signal, not from status alone.
      expect(parsed.uploaded).toBe(true);
      expect(parsed.fileUrl).toBe('https://cdn.example.com/signature.png');
    });

    it('treats an uploaded status as uploaded', async () => {
      const raw = await getSlaSignatureSessionStatus(
        makePersistence(makeSessionRow({ status: 'uploaded', fileUrl: null })),
        'onb-1',
        SESSION_ID,
      );

      expect(
        slaSignatureSessionStatusResponseSchema.parse(overTheWire(raw))
          .uploaded,
      ).toBe(true);
    });

    it('refuses an empty status payload', () => {
      // The failure the old all-optional client type could not detect.
      expect(
        slaSignatureSessionStatusResponseSchema.safeParse({}).success,
      ).toBe(false);
    });

    it('treats every status field as required', () => {
      const complete: Record<string, unknown> = {
        status: 'pending',
        uploaded: false,
        fileUrl: null,
      };
      for (const key of Object.keys(complete)) {
        const { [key]: _dropped, ...rest } = complete;
        assert.ok(
          !slaSignatureSessionStatusResponseSchema.safeParse(rest).success,
          `expected "${key}" to be required`,
        );
      }
    });

    it('refuses a status whose uploaded flag is a string', () => {
      expect(
        slaSignatureSessionStatusResponseSchema.safeParse({
          status: 'pending',
          uploaded: 'false',
          fileUrl: null,
        }).success,
      ).toBe(false);
    });
  });

  describe('POST /onboarding/:id/sla-signature-session/:sessionId', () => {
    let uploadsService: UploadsService;
    let persistence: ClinicPersistencePort;

    beforeEach(() => {
      uploadsService = makeUploadsService();
      persistence = makePersistence(makeSessionRow());
    });

    it('parses the uploaded session', async () => {
      const raw = await uploadSlaSignature(
        persistence,
        uploadsService,
        'onb-1',
        SESSION_ID,
        FILE,
        'plaintext-secret',
        NOW,
      );

      const parsed = uploadSessionContractResponseSchema.parse(
        overTheWire(raw),
      );
      expect(parsed.status).toBe('uploaded');
      expect(parsed.fileUrl).toBe('https://cdn.example.com/signature.png');
      // The upload response never carries the secret or its hash.
      expect(parsed).not.toHaveProperty('uploadSecret');
      expect(parsed).not.toHaveProperty('uploadSecretHash');
    });

    it('expires the one-time link after a successful upload', async () => {
      await uploadSlaSignature(
        persistence,
        uploadsService,
        'onb-1',
        SESSION_ID,
        FILE,
        'plaintext-secret',
        NOW,
      );

      expect(uploadsService.updateSession).toHaveBeenCalledWith(
        SESSION_ID,
        FILE,
        expect.objectContaining({ uploadSecret: 'plaintext-secret' }),
      );
      expect(persistence.uploadSession.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: { expiresAt: NOW },
      });
    });

    it('refuses an expired link before touching storage', async () => {
      const expired = makePersistence(
        makeSessionRow({ expiresAt: new Date('2026-07-04T09:00:00.000Z') }),
      );

      await expect(
        uploadSlaSignature(
          expired,
          uploadsService,
          'onb-1',
          SESSION_ID,
          FILE,
          'plaintext-secret',
          NOW,
        ),
      ).rejects.toThrow(/expired/i);
      expect(uploadsService.updateSession).not.toHaveBeenCalled();
    });

    it('refuses a link that has already been used', async () => {
      const used = makePersistence(
        makeSessionRow({
          status: 'uploaded',
          fileUrl: 'https://cdn.example.com/signature.png',
        }),
      );

      await expect(
        uploadSlaSignature(
          used,
          uploadsService,
          'onb-1',
          SESSION_ID,
          FILE,
          'plaintext-secret',
          NOW,
        ),
      ).rejects.toThrow(/already been used/i);
      expect(uploadsService.updateSession).not.toHaveBeenCalled();
    });

    it('404s an unknown session', async () => {
      await expect(
        uploadSlaSignature(
          makePersistence(null),
          uploadsService,
          'onb-1',
          SESSION_ID,
          FILE,
          'plaintext-secret',
          NOW,
        ),
      ).rejects.toThrow(/not found/i);
    });
  });

  /**
   * The serializer is the only thing standing between a public route and the
   * `uploadSecretHash` column, so it is tested as the interceptor actually runs:
   * real `Reflector`, real handler metadata, real service payload. Asserting only
   * that the helper's output parses (above) would have left the annotation itself
   * completely unverified — dropping `@ZodSerializerDto` broke no test.
   */
  describe('response serialization on the public routes', () => {
    const reflector = new Reflector();
    const interceptor = new SafeZodSerializerInterceptor(reflector);

    function serialize(
      handler: (...args: never[]) => unknown,
      payload: unknown,
    ): Promise<unknown> {
      const context = {
        getHandler: () => handler,
        getClass: () => OnboardingSlaSignatureController,
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', url: '/onboarding/onb-1' }),
        }),
      } as unknown as ExecutionContext;

      return lastValueFrom(
        interceptor.intercept(context, {
          handle: () => of(payload),
        } as CallHandler),
      );
    }

    it('declares a response contract on every public route', () => {
      // Asserting the serialized value alone cannot detect a missing decorator
      // on a route whose payload already matches its contract — nothing is
      // stripped, so the output looks identical either way. These three routes
      // are `@Public()`, so the declaration itself is the invariant worth
      // holding: it is what keeps a newly added column off the wire.
      const handlers = {
        create:
          OnboardingSlaSignatureController.prototype.createSlaSignatureSession,
        status:
          OnboardingSlaSignatureController.prototype
            .getSlaSignatureSessionStatus,
        upload: OnboardingSlaSignatureController.prototype.uploadSlaSignature,
      };

      for (const [name, handler] of Object.entries(handlers)) {
        const declared = reflector.getAllAndOverride<unknown>(
          'ZOD_SERIALIZER_DTO_OPTIONS',
          [handler, OnboardingSlaSignatureController],
        );
        // `expect` in this suite is Jest's, which takes no message argument.
        assert.ok(declared, `${name} route declares no response contract`);
      }
    });

    it('strips the secret hash from the public create response', async () => {
      const payload = {
        ...makeSessionRow(),
        uploadSecret: 'plaintext-secret',
      };
      const handler =
        OnboardingSlaSignatureController.prototype.createSlaSignatureSession;

      const serialized = (await serialize(handler, payload)) as Record<
        string,
        unknown
      >;

      expect(serialized).not.toHaveProperty('uploadSecretHash');
      // The plaintext secret is the credential the caller needs; it stays.
      expect(serialized.uploadSecret).toBe('plaintext-secret');
      expect(serialized.id).toBe(SESSION_ID);
    });

    it('serializes the public status response', async () => {
      const handler =
        OnboardingSlaSignatureController.prototype.getSlaSignatureSessionStatus;

      const serialized = await serialize(handler, {
        status: 'pending',
        uploaded: false,
        fileUrl: null,
      });

      expect(serialized).toEqual({
        status: 'pending',
        uploaded: false,
        fileUrl: null,
      });
    });

    it('serializes the public upload response', async () => {
      const handler =
        OnboardingSlaSignatureController.prototype.uploadSlaSignature;

      const serialized = (await serialize(handler, {
        id: SESSION_ID,
        status: 'uploaded',
        fileUrl: 'https://cdn.example.com/signature.png',
        purpose: 'GENERAL',
        doctorId: null,
        createdAt: new Date('2026-07-04T09:40:00.000Z'),
        expiresAt: new Date('2026-07-04T10:00:00.000Z'),
      })) as Record<string, unknown>;

      expect(serialized.status).toBe('uploaded');
      expect(serialized).not.toHaveProperty('uploadSecretHash');
    });

    it('passes an unmatched payload through unchanged, hash included', async () => {
      // The interceptor deliberately does not throw on a mismatch (it logs and
      // forwards the original so no endpoint 500s). That fallback is exactly why
      // the contract has to keep matching the service: on a mismatch nothing is
      // trimmed. Documented here so nobody assumes stripping is unconditional.
      const handler =
        OnboardingSlaSignatureController.prototype.createSlaSignatureSession;
      const payload = {
        ...makeSessionRow(),
        uploadSecret: 'plaintext-secret',
        expiresAt: undefined,
      };

      const serialized = (await serialize(handler, payload)) as Record<
        string,
        unknown
      >;

      expect(serialized.uploadSecretHash).toBe('a'.repeat(64));
    });
  });

  describe('upload session contract', () => {
    it('requires the fields the client used to read as optional', () => {
      const complete: Record<string, unknown> = {
        id: SESSION_ID,
        status: 'uploaded',
        fileUrl: null,
        createdAt: new Date('2026-07-04T09:40:00.000Z'),
        expiresAt: new Date('2026-07-04T10:00:00.000Z'),
      };

      // The old client interface had all three of id/status/fileUrl optional,
      // so an empty response satisfied it and "not uploaded" read as success.
      expect(
        z.array(uploadSessionContractResponseSchema).safeParse([]).success,
      ).toBe(true);
      expect(uploadSessionContractResponseSchema.safeParse({}).success).toBe(
        false,
      );
      for (const key of ['id', 'status', 'createdAt', 'expiresAt']) {
        const { [key]: _dropped, ...rest } = complete;
        assert.ok(
          !uploadSessionContractResponseSchema.safeParse(rest).success,
          `expected "${key}" to be required`,
        );
      }
    });

    it('accepts both Date and string timestamps', () => {
      const base = {
        id: SESSION_ID,
        status: 'pending',
        fileUrl: null,
        createdAt: new Date('2026-07-04T09:40:00.000Z'),
        expiresAt: new Date('2026-07-04T10:00:00.000Z'),
      };
      expect(uploadSessionContractResponseSchema.safeParse(base).success).toBe(
        true,
      );
      expect(
        uploadSessionContractResponseSchema.safeParse({
          ...base,
          createdAt: base.createdAt.toISOString(),
          expiresAt: base.expiresAt.toISOString(),
        }).success,
      ).toBe(true);
    });

    it('refuses a blank upload secret on the create response', () => {
      const base = {
        id: SESSION_ID,
        status: 'pending',
        fileUrl: null,
        createdAt: new Date('2026-07-04T09:40:00.000Z'),
        expiresAt: new Date('2026-07-04T10:00:00.000Z'),
        uploadSecret: 'plaintext-secret',
      };
      expect(
        uploadSessionCreateContractResponseSchema.safeParse(base).success,
      ).toBe(true);
      // A blank secret would produce an `X-Upload-Secret: ''` header that the
      // guard rejects with "Upload credentials are required".
      expect(
        uploadSessionCreateContractResponseSchema.safeParse({
          ...base,
          uploadSecret: '',
        }).success,
      ).toBe(false);
    });
  });
});

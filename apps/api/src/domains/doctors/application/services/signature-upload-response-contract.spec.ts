import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import assert from 'node:assert/strict';
import {
  signatureTokenValidationResponseSchema,
  signatureUploadResponseSchema,
} from '@workspace/types';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { SignatureUploadController } from '@/domains/doctors/presentation/controllers/signature-upload.controller';
import { ClinicSignatureController } from '@/domains/clinics/presentation/controllers/clinic-signature.controller';
import { SafeZodSerializerInterceptor } from '@/shared/common/interceptors/safe-zod-serializer.interceptor';

/** The SPA receives JSON, not the in-process objects the service returns. */
function overTheWire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

const DOCTOR_SIGNATURE_UPLOAD = {
  success: true,
  signatureUrl: 'https://cdn.test/sig.png',
  signatureStoredUrl: 'documents/sig.png',
  purpose: 'DOCTOR_PRESCRIPTION',
  doctor: { id: 'doc_1', name: 'Dr Asha Rao' },
};

const SLA_SIGNATURE_UPLOAD = {
  success: true,
  signatureUrl: 'https://cdn.test/sla.png',
  signatureStoredUrl: 'documents/sla.png',
  purpose: 'SLA_ACCEPTANCE',
  clinic: { id: 'clinic_1', name: 'Rao Dental' },
};

const TOKEN_VALIDATION = {
  tokenId: 'utok_1',
  purpose: 'DOCTOR_PRESCRIPTION',
  doctor: {
    id: 'doc_1',
    name: 'Dr Asha Rao',
    email: 'asha@clinic.test',
    signatureUrl: 'https://cdn.test/sig.png',
  },
  clinic: null,
};

/**
 * `POST .../signature/upload/:token` on both signature controllers.
 *
 * Both routes are `@Public()` and both call the same `handleSignatureUpload`,
 * whose result is `SignatureUploadService.uploadSignature`. That service returns
 * one of two shapes keyed by `purpose` — an SLA acceptance carries the clinic,
 * a prescription signature carries the doctor — and neither route declared a
 * serializer, so the raw object went out on a link that needs no session.
 *
 * `signature-token-contract.spec.ts` covers the paired `validate-token`
 * response; this file covers the upload half plus the serializer boundary for
 * all four public signature routes.
 */
describe('signature upload response contract', () => {
  describe('shape', () => {
    it('parses the doctor prescription signature upload', () => {
      const parsed = signatureUploadResponseSchema.parse(
        overTheWire(DOCTOR_SIGNATURE_UPLOAD),
      );
      expect(parsed.purpose).toBe('DOCTOR_PRESCRIPTION');
      if (parsed.purpose !== 'DOCTOR_PRESCRIPTION')
        throw new Error('expected the doctor branch');
      expect(parsed.doctor).toEqual({ id: 'doc_1', name: 'Dr Asha Rao' });
      expect(parsed).not.toHaveProperty('clinic');
    });

    it('parses the SLA acceptance upload', () => {
      const parsed = signatureUploadResponseSchema.parse(
        overTheWire(SLA_SIGNATURE_UPLOAD),
      );
      expect(parsed.purpose).toBe('SLA_ACCEPTANCE');
      if (parsed.purpose !== 'SLA_ACCEPTANCE')
        throw new Error('expected the SLA branch');
      expect(parsed.clinic).toEqual({ id: 'clinic_1', name: 'Rao Dental' });
      expect(parsed).not.toHaveProperty('doctor');
    });

    it('keeps only the side that matches the purpose', () => {
      // Stripping, not rejection: a payload carrying both sides still parses,
      // and the mismatched side is dropped so it cannot reach a public client.
      // Rejecting instead would turn a widened service select into a 500 on an
      // unauthenticated route.
      const withBoth = signatureUploadResponseSchema.parse(
        overTheWire({
          ...SLA_SIGNATURE_UPLOAD,
          doctor: DOCTOR_SIGNATURE_UPLOAD.doctor,
        }),
      );
      if (withBoth.purpose !== 'SLA_ACCEPTANCE')
        throw new Error('expected the SLA branch');
      expect(withBoth).not.toHaveProperty('doctor');
      expect(withBoth.clinic).toEqual(SLA_SIGNATURE_UPLOAD.clinic);

      const flipped = signatureUploadResponseSchema.parse(
        overTheWire({
          ...DOCTOR_SIGNATURE_UPLOAD,
          clinic: SLA_SIGNATURE_UPLOAD.clinic,
        }),
      );
      if (flipped.purpose !== 'DOCTOR_PRESCRIPTION')
        throw new Error('expected the doctor branch');
      expect(flipped).not.toHaveProperty('clinic');
      expect(flipped.doctor).toEqual(DOCTOR_SIGNATURE_UPLOAD.doctor);
    });

    it('refuses an upload that is missing the side its purpose requires', () => {
      expect(
        signatureUploadResponseSchema.safeParse({
          success: true,
          signatureUrl: 'https://cdn.test/sla.png',
          signatureStoredUrl: 'documents/sla.png',
          purpose: 'SLA_ACCEPTANCE',
        }).success,
      ).toBe(false);
      expect(
        signatureUploadResponseSchema.safeParse({
          success: true,
          signatureUrl: 'https://cdn.test/sig.png',
          signatureStoredUrl: 'documents/sig.png',
          purpose: 'DOCTOR_PRESCRIPTION',
        }).success,
      ).toBe(false);
    });

    it('refuses an upload that is not successful', () => {
      expect(
        signatureUploadResponseSchema.safeParse({
          ...DOCTOR_SIGNATURE_UPLOAD,
          success: false,
        }).success,
      ).toBe(false);
    });

    it('treats every upload key as required', () => {
      const complete: Record<string, unknown> = {
        success: true,
        signatureUrl: 'https://cdn.test/sig.png',
        signatureStoredUrl: 'documents/sig.png',
        purpose: 'DOCTOR_PRESCRIPTION',
        doctor: { id: 'doc_1', name: 'Dr Asha Rao' },
      };
      for (const key of Object.keys(complete)) {
        const { [key]: _dropped, ...rest } = complete;
        assert.ok(
          !signatureUploadResponseSchema.safeParse(rest).success,
          `expected "${key}" to be required`,
        );
      }
    });

    it('still parses the paired token validation response', () => {
      expect(
        signatureTokenValidationResponseSchema.safeParse(
          overTheWire(TOKEN_VALIDATION),
        ).success,
      ).toBe(true);
    });
  });

  describe('serializer on the public routes', () => {
    const reflector = new Reflector();
    const interceptor = new SafeZodSerializerInterceptor(reflector);

    function serialize(
      owner:
        | typeof SignatureUploadController
        | typeof ClinicSignatureController,
      handler: (...args: never[]) => unknown,
      payload: unknown,
    ): Promise<unknown> {
      const context = {
        getHandler: () => handler,
        getClass: () => owner,
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', url: '/signature' }),
        }),
      } as unknown as ExecutionContext;

      return lastValueFrom(
        interceptor.intercept(context, {
          handle: () => of(payload),
        } as CallHandler),
      );
    }

    const routes = [
      {
        name: 'doctor validate-token',
        owner: SignatureUploadController,
        handler: SignatureUploadController.prototype.validateToken,
        payload: TOKEN_VALIDATION,
      },
      {
        name: 'doctor upload',
        owner: SignatureUploadController,
        handler: SignatureUploadController.prototype.uploadSignature,
        payload: DOCTOR_SIGNATURE_UPLOAD,
      },
      {
        name: 'clinic validate-token',
        owner: ClinicSignatureController,
        handler: ClinicSignatureController.prototype.validateToken,
        payload: TOKEN_VALIDATION,
      },
      {
        name: 'clinic upload',
        owner: ClinicSignatureController,
        handler: ClinicSignatureController.prototype.uploadSignature,
        payload: DOCTOR_SIGNATURE_UPLOAD,
      },
    ];

    it.each(routes)('$name declares a response contract', (route) => {
      const declared = reflector.getAllAndOverride<unknown>(
        'ZOD_SERIALIZER_DTO_OPTIONS',
        [route.handler, route.owner],
      );
      assert.ok(declared, `${route.name} declares no response contract`);
    });

    it.each(routes)(
      '$name serializes without dropping a real field',
      async (route) => {
        const serialized = await serialize(
          route.owner,
          route.handler,
          route.payload,
        );
        expect(serialized).toEqual(overTheWire(route.payload));
      },
    );

    it('trims an unexpected field the service starts returning', async () => {
      const serialized = (await serialize(
        SignatureUploadController,
        SignatureUploadController.prototype.uploadSignature,
        {
          ...DOCTOR_SIGNATURE_UPLOAD,
          uploadSecretHash: 'deadbeef',
        },
      )) as Record<string, unknown>;

      expect(serialized).not.toHaveProperty('uploadSecretHash');
      expect(serialized.signatureStoredUrl).toBe('documents/sig.png');
    });
  });
});

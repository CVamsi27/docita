import { describe, expect, it, jest } from '@jest/globals';
import { signatureTokenValidationResponseSchema } from '@workspace/types';
import { SignatureUploadService } from './signature-upload.service';

/**
 * Contract parity for `GET /doctors/signature/validate-token/:token`.
 *
 * Public and unauthenticated — reached from a QR code or SMS link — so it is
 * the most exposed response in the product and the least guarded by a session.
 *
 * The SPA hand-wrote this shape and the copy had drifted in both directions:
 * `purpose` was `string` where the server sends a two-value `SignaturePurpose`
 * enum, and `signatureUrl` was declared `string | null` when the service builds
 * it as `resolved.url ?? undefined` — so the declared `null` was a case the
 * server could never produce, and every URL field lied about absence.
 *
 * These tests drive the real service so a change to the repository select or
 * the URL resolution fails here instead of drifting silently into the SPA.
 */

const NOW = new Date('2026-03-01T10:00:00.000Z');

/** A repository row: Prisma returns `string | null` for a stored URL. */
const DOCTOR = {
  id: 'doc_1',
  name: 'Dr Asha Rao',
  email: 'asha@clinic.test',
  signatureUrl: 'https://cdn.test/sig.png' as string | null,
};

const CLINIC = {
  id: 'clinic_1',
  name: 'Rao Dental',
  slaSignatureUrl: 'https://cdn.test/sla.png' as string | null,
};

function buildService(
  overrides: {
    doctor?: typeof DOCTOR | null;
    clinic?: typeof CLINIC | null;
    storedUrl?: string | null;
    token?: {
      id: string;
      purpose: 'DOCTOR_PRESCRIPTION' | 'SLA_ACCEPTANCE';
      doctor?: unknown;
      clinic?: unknown;
      used?: boolean;
      expiresAt?: Date;
    };
  } = {},
) {
  const uploadToken =
    overrides.token ??
    ({
      id: 'utok_1',
      purpose: 'DOCTOR_PRESCRIPTION' as const,
      doctor: overrides.doctor === undefined ? DOCTOR : overrides.doctor,
      clinic: overrides.clinic === undefined ? null : overrides.clinic,
      used: false,
      expiresAt: new Date(NOW.getTime() + 60_000),
    } as never);

  const resolveWithStoredUrl = jest.fn(async (url: string | null) => ({
    url: url ?? undefined,
    storedUrl: overrides.storedUrl ?? undefined,
  }));

  const service = new SignatureUploadService(
    { findTokenByValue: async () => uploadToken } as never,
    {} as never,
    { resolveWithStoredUrl } as never,
    { now: () => NOW } as never,
  );

  return { service, resolveWithStoredUrl };
}

describe('GET /doctors/signature/validate-token response contract', () => {
  it('satisfies the shared schema on the doctor path', async () => {
    const { service } = buildService();
    const result = await service.validateToken('tok_abc');
    expect(() =>
      signatureTokenValidationResponseSchema.parse(result),
    ).not.toThrow();
  });

  it('satisfies the shared schema when both doctor and clinic are absent', async () => {
    // A token can carry neither relation. The old copy typed both as nullable
    // but this path had no coverage, and `null` here is a real server state.
    const { service } = buildService({ doctor: null, clinic: null });
    const result = await service.validateToken('tok_abc');
    expect(signatureTokenValidationResponseSchema.parse(result)).toEqual({
      tokenId: 'utok_1',
      purpose: 'DOCTOR_PRESCRIPTION',
      doctor: null,
      clinic: null,
    });
  });

  it('omits the signature URL when storage resolves to nothing', async () => {
    // The service builds `signatureUrl: resolved.url ?? undefined`, so an
    // absent URL is `undefined`, not `null`. The old copy declared
    // `string | null`, which described a state the server cannot produce and
    // would have had every consumer write a null branch that never fires.
    const { service } = buildService({
      doctor: { ...DOCTOR, signatureUrl: null },
      storedUrl: null,
    });
    const parsed = signatureTokenValidationResponseSchema.parse(
      await service.validateToken('tok_abc'),
    );
    expect(parsed.doctor).not.toBeNull();
    expect(parsed.doctor?.signatureUrl).toBeUndefined();
    expect(parsed.doctor?.signatureStoredUrl).toBeUndefined();
  });

  it('carries the resolved and stored URLs when storage returns them', async () => {
    const { service } = buildService({ storedUrl: 'signatures/sig.png' });
    const parsed = signatureTokenValidationResponseSchema.parse(
      await service.validateToken('tok_abc'),
    );
    expect(parsed.doctor).toMatchObject({
      id: 'doc_1',
      name: 'Dr Asha Rao',
      email: 'asha@clinic.test',
      signatureUrl: 'https://cdn.test/sig.png',
      signatureStoredUrl: 'signatures/sig.png',
    });
  });

  it('rejects a purpose outside the enum', () => {
    // `purpose: string` in the old copy let any token typecheck. This is the
    // assertion that closes it.
    expect(() =>
      signatureTokenValidationResponseSchema.parse({
        tokenId: 'utok_1',
        purpose: 'SOMETHING_ELSE',
        doctor: null,
        clinic: null,
      }),
    ).toThrow();
  });

  it('carries the clinic relation for an SLA token', async () => {
    // An SLA token has a clinic and no signature URL on the doctor. Dropping
    // the clinic branch was invisible until this test existed: every other case
    // drove the doctor path, so a mutation that replaced
    // `resolveClinicSignatureUrl(uploadToken.clinic)` with a literal `null`
    // left the suite green.
    const { service } = buildService({
      clinic: CLINIC,
      storedUrl: 'signatures/sla.png',
      token: {
        id: 'utok_sla',
        purpose: 'SLA_ACCEPTANCE',
        doctor: DOCTOR,
        clinic: CLINIC,
        used: false,
        expiresAt: new Date(NOW.getTime() + 60_000),
      } as never,
    });
    const parsed = signatureTokenValidationResponseSchema.parse(
      await service.validateToken('tok_abc'),
    );
    expect(parsed.purpose).toBe('SLA_ACCEPTANCE');
    expect(parsed.clinic).toEqual({
      id: 'clinic_1',
      name: 'Rao Dental',
      slaSignatureUrl: 'https://cdn.test/sla.png',
      slaSignatureStoredUrl: 'signatures/sla.png',
    });
    expect(parsed.doctor).toMatchObject({ id: 'doc_1' });
  });

  it('strips a doctor field the select does not return', () => {
    // This endpoint is public and unauthenticated, so the contract is a
    // filter, not a forwarder: an unexpected key is dropped rather than passed
    // on to an anonymous caller. Asserting the *strip*, not a rejection —
    // `z.object` strips by default, and adding `.strict()` here would turn a
    // future repository select widening into a 500 on a QR-code link.
    const parsed = signatureTokenValidationResponseSchema.parse({
      tokenId: 'utok_1',
      purpose: 'DOCTOR_PRESCRIPTION',
      doctor: { ...DOCTOR, registrationNumber: 'MCI-123' },
      clinic: null,
    });
    expect(parsed.doctor).toEqual(DOCTOR);
    expect('registrationNumber' in (parsed.doctor ?? {})).toBe(false);
  });

  it('still rejects a used token before parsing anything', async () => {
    const { service } = buildService({
      token: {
        id: 'utok_1',
        purpose: 'DOCTOR_PRESCRIPTION',
        doctor: DOCTOR,
        clinic: null,
        used: true,
        expiresAt: new Date(NOW.getTime() + 60_000),
      } as never,
    });
    await expect(service.validateToken('tok_abc')).rejects.toThrow(
      'Token has already been used',
    );
  });

  it('still rejects an expired token', async () => {
    const { service } = buildService({
      token: {
        id: 'utok_1',
        purpose: 'DOCTOR_PRESCRIPTION',
        doctor: DOCTOR,
        clinic: null,
        used: false,
        expiresAt: new Date(NOW.getTime() - 1000),
      } as never,
    });
    await expect(service.validateToken('tok_abc')).rejects.toThrow(
      'Token has expired',
    );
  });

  it('still rejects an unknown token', async () => {
    const service = new SignatureUploadService(
      { findTokenByValue: async () => null } as never,
      {} as never,
      { resolveWithStoredUrl: jest.fn() } as never,
      { now: () => NOW } as never,
    );
    await expect(service.validateToken('nope')).rejects.toThrow(
      'Invalid upload token',
    );
  });
});

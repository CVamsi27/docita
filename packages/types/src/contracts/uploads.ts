import { z } from "zod";
import { uploadSessionSchema } from "../shared/uploads";

export const uploadSessionContractResponseSchema = uploadSessionSchema;

/**
 * `uploadSecret` is `.min(1)` because the caller immediately sends it as the
 * `X-Upload-Secret` header: a blank value produces a header the
 * `UploadSessionSecretGuard` rejects with "Upload credentials are required",
 * so an empty string is never a value the product can use.
 */
export const uploadSessionCreateContractResponseSchema =
  uploadSessionSchema.extend({
    uploadSecret: z.string().min(1),
  });

export type UploadSessionContractResponse = z.infer<
  typeof uploadSessionContractResponseSchema
>;

export type UploadSessionCreateContractResponse = z.infer<
  typeof uploadSessionCreateContractResponseSchema
>;

/**
 * Why a signature upload token was issued.
 *
 * Mirrors the Prisma `SignaturePurpose` enum. `check:enum-map-drift` pins
 * UPPER_SNAKE display-map keys to enum members; this keeps the *wire* copy
 * honest too, so an added purpose cannot reach the SPA as an unbounded string.
 */
export const signaturePurposeSchema = z.enum([
  "DOCTOR_PRESCRIPTION",
  "SLA_ACCEPTANCE",
]);
export type SignaturePurpose = z.infer<typeof signaturePurposeSchema>;

/**
 * Response of `GET /doctors/signature/validate-token/:token`.
 *
 * Public and unauthenticated: reached from a QR code or SMS link, so it is the
 * most exposed surface in the product and the least guarded by a session.
 *
 * The SPA used to hand-write this shape, and the copy had drifted in both
 * directions:
 *
 *  - `purpose: string` where the server sends a two-value enum, so any purpose
 *    token typechecked against it;
 *  - `signatureUrl: string | null`, but the service builds it as
 *    `resolved.url ?? undefined` — the declared `null` never occurs, and a
 *    consumer reading the type would handle a case the server cannot produce.
 *
 * The URL fields are `.optional()` for the same reason: absent storage resolves
 * to `undefined`, not `null`.
 */
export const signatureTokenValidationResponseSchema = z.object({
  tokenId: z.string(),
  purpose: signaturePurposeSchema,
  doctor: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      signatureUrl: z.string().optional(),
      signatureStoredUrl: z.string().optional(),
    })
    .nullable(),
  clinic: z
    .object({
      id: z.string(),
      name: z.string(),
      slaSignatureUrl: z.string().optional(),
      slaSignatureStoredUrl: z.string().optional(),
    })
    .nullable(),
});

export type SignatureTokenValidationResponse = z.infer<
  typeof signatureTokenValidationResponseSchema
>;

/**
 * Response of
 * `GET /onboarding/:onboardingId/sla-signature-session/:sessionId/status`.
 *
 * The onboarding signature routes are all `@Public()` — reached from a link in
 * an onboarding email, with no session to authenticate — and the SPA typed this
 * one by hand as three optional fields, so `{}` satisfied it: a status endpoint
 * that stopped answering would have looked like "not uploaded yet" forever.
 *
 * The server declared the same three fields inline on
 * `getSlaSignatureSessionStatus`, so there were two hand-written copies of one
 * response and no check that either matched the other. Both now come from here.
 */
export const slaSignatureSessionStatusResponseSchema = z.object({
  status: z.string(),
  uploaded: z.boolean(),
  fileUrl: z.string().nullable(),
});

export type SlaSignatureSessionStatusResponse = z.infer<
  typeof slaSignatureSessionStatusResponseSchema
>;

/**
 * Response of `POST .../signature/upload/:token`, shared by the doctor and the
 * clinic signature controllers (both call `handleSignatureUpload`).
 *
 * `SignatureUploadService.uploadSignature` returns one of two shapes keyed by
 * `purpose` — an SLA acceptance carries the clinic, a prescription signature
 * carries the doctor — so this is a discriminated union rather than one object
 * with both sides optional, which is what the SPA had to guess at.
 *
 * Both routes are `@Public()` and had no serializer, so the raw service object
 * went out untrimmed; the contract is what keeps a future field off a link that
 * needs no session to reach.
 */
const signatureUploadBase = {
  success: z.literal(true),
  signatureUrl: z.string(),
  signatureStoredUrl: z.string(),
};

export const signatureUploadResponseSchema = z.discriminatedUnion("purpose", [
  z.object({
    ...signatureUploadBase,
    purpose: z.literal("SLA_ACCEPTANCE"),
    clinic: z.object({ id: z.string(), name: z.string() }),
  }),
  z.object({
    ...signatureUploadBase,
    purpose: z.literal("DOCTOR_PRESCRIPTION"),
    doctor: z.object({ id: z.string(), name: z.string() }),
  }),
]);

export type SignatureUploadResponse = z.infer<typeof signatureUploadResponseSchema>;

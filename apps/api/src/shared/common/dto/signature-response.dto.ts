import { createZodDto } from 'nestjs-zod';
import { signatureTokenValidationResponseSchema } from '@workspace/types';

/**
 * Shared by the doctor and clinic signature controllers so neither has to
 * import the other's DTO — both are `@Public()` routes reached from a QR or
 * SMS link, and both used to serialize nothing.
 *
 * There is deliberately no `SignatureUploadResponseDto`: the upload response is
 * a discriminated union on `purpose`, and `createZodDto` cannot wrap one (a
 * class base constructor must return a single object type). The upload routes
 * pass `signatureUploadResponseSchema` to `@ZodSerializerDto` directly, which
 * the serializer accepts.
 */
export class SignatureTokenValidationResponseDto extends createZodDto(
  signatureTokenValidationResponseSchema,
) {}

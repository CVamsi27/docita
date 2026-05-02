import { SetMetadata } from '@nestjs/common';

/**
 * Marks a handler that authenticates via `UploadSessionSecretGuard` using
 * `X-Upload-Secret` (capability token), not JWT. Skips the same global guards as
 * `Public` for this handler only; unlike `Public`, `UploadSessionSecretGuard`
 * must validate the secret before the handler runs.
 */
export const IS_UPLOAD_SESSION_SECRET_ROUTE_KEY = 'uploadSessionSecretRoute';

export const UploadSessionSecretRoute = () =>
  SetMetadata(IS_UPLOAD_SESSION_SECRET_ROUTE_KEY, true);
